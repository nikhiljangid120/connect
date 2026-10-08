import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Button, CircularProgress, Typography } from '@material-ui/core';
import ReactPlayer from 'react-player/file';
import { api } from '../../api/backend';
import Colors from '../../colors';
import { ErrorOutline } from '../../icons';
import { pause, play } from '../../timeline/playback';
import { ACTION_MEDIA_TIME, ACTION_MEDIA_DETACH } from '../../actions/types';
import { attachMediaClock } from '../../timeline/mediaClock';

function errorMessage(error, data) {
  const detail = error === 'hlsError' ? data : error;
  if (!detail || detail.name === 'AbortError' || (error === 'hlsError' && !detail.fatal)) return null;
  if (detail.response?.code === 404) return 'This video segment has not uploaded yet or has been deleted.';
  if (detail.name === 'NotAllowedError') return 'Tap Retry to allow video playback.';
  if (detail.type === 'networkError') return 'Unable to load video. Check your network connection.';
  return 'Unable to load video.';
}

export class DriveVideo extends Component {
  videoPlayer = React.createRef();
  state = { videoError: null, retry: 0, showLoading: false, autoplayBlocked: false };
  listeners = [];

  componentDidMount() { this.updateLoading(); }

  componentDidUpdate(previous) {
    if (previous.currentRoute?.fullname !== this.props.currentRoute?.fullname) {
      this.detach();
      this.setState({ videoError: null });
    } else if (previous.seekRevision !== this.props.seekRevision) {
      if (this.state.videoError) this.retry();
      else this.applySeek(this.props.offset);
    }
    if (previous.isBufferingVideo !== this.props.isBufferingVideo
      || previous.desiredPlaySpeed !== this.props.desiredPlaySpeed) this.updateLoading();
  }

  componentWillUnmount() {
    this.detach();
    clearTimeout(this.loadingTimer);
  }

  updateLoading() {
    clearTimeout(this.loadingTimer);
    if (this.props.isBufferingVideo && this.props.desiredPlaySpeed) {
      this.loadingTimer = setTimeout(() => this.setState({ showLoading: true }), 300);
    } else if (this.state.showLoading) this.setState({ showLoading: false });
  }

  detach = () => {
    cancelAnimationFrame(this.frame);
    for (const [video, event, listener] of this.listeners) video.removeEventListener(event, listener);
    this.listeners = [];
    this.releaseClock?.();
    this.releaseClock = null;
    if (this.boundRoute) this.props.dispatch({ type: ACTION_MEDIA_DETACH, route: this.boundRoute });
    this.boundRoute = null;
    this.video = null;
  };

  videoOffset = () => (this.video?.currentTime ?? 0) * 1000 + (this.props.currentRoute?.videoStartOffset || 0);

  observe = (buffering = this.video?.seeking || this.video?.readyState < 2) => {
    if (!this.video || this.boundRoute !== this.props.currentRoute?.fullname) return;
    this.props.dispatch({ type: ACTION_MEDIA_TIME, route: this.boundRoute,
      offset: this.videoOffset(), buffering: Boolean(buffering) });
  };

  applySeek = (offset) => {
    if (!this.video || !Number.isFinite(offset)) return;
    const seconds = Math.max(0, (offset - (this.props.currentRoute?.videoStartOffset || 0)) / 1000);
    this.videoPlayer.current.seekTo(seconds, 'seconds');
  };

  onReady = () => {
    const video = this.videoPlayer.current?.getInternalPlayer();
    if (!video || !this.props.currentRoute) return;
    if (this.video === video && this.boundRoute === this.props.currentRoute.fullname) {
      this.observe();
      return;
    }
    this.detach();
    this.video = video;
    this.boundRoute = this.props.currentRoute.fullname;
    this.releaseClock = attachMediaClock(this.boundRoute, this.videoOffset);
    const listen = (event, callback) => {
      video.addEventListener(event, callback);
      this.listeners.push([video, event, callback]);
    };
    listen('seeking', () => this.observe(true));
    listen('seeked', () => this.observe());
    listen('timeupdate', () => this.observe());
    listen('canplay', () => this.observe(false));
    listen('playing', () => this.observe(false));
    listen('ratechange', () => {
      if (!video.paused && video.playbackRate !== this.props.desiredPlaySpeed) {
        this.props.dispatch(play(video.playbackRate));
      }
    });
    this.applySeek(this.props.offset ?? this.props.loop?.startTime ?? 0);
    this.observe();
    const tracks = video.audioTracks;
    if (tracks?.length) this.props.onAudioStatusChange?.(true);
    const hls = this.videoPlayer.current.getInternalPlayer('hls');
    if (hls) {
      const codecs = (_event, data) => this.props.onAudioStatusChange?.(Boolean(data.audio));
      hls.on('hlsBufferCodecs', codecs);
      const release = this.releaseClock;
      this.releaseClock = () => { hls.off('hlsBufferCodecs', codecs); release(); };
    }
    this.checkLoop();
  };

  checkLoop = () => {
    if (!this.video) return;
    const { loop, desiredPlaySpeed } = this.props;
    const offset = this.videoOffset();
    if (loop && loop.duration > 0 && desiredPlaySpeed && !this.video.seeking
      && (offset < loop.startTime || offset >= loop.startTime + loop.duration)) {
      this.applySeek(loop.startTime);
    }
    // Observe the real media time; never drag playback toward a wall clock.
    this.frame = requestAnimationFrame(this.checkLoop);
  };

  onPause = () => {
    this.observe();
    if (this.video && !this.video.seeking && !this.video.ended && this.video.readyState >= 2
      && this.props.desiredPlaySpeed) this.props.dispatch(pause());
  };

  onEnded = () => {
    const { loop } = this.props;
    if (loop?.duration > 0) {
      this.applySeek(loop.startTime);
      this.video?.play()?.catch(this.onError);
    } else this.props.dispatch(pause());
  };

  onError = (error, data) => {
    const message = errorMessage(error, data);
    if (!message) return;
    this.observe(true);
    if (error?.name === 'NotAllowedError') {
      this.props.dispatch(pause());
      this.setState({ videoError: message, showLoading: false, autoplayBlocked: true });
      return;
    }
    this.detach();
    this.setState({ videoError: message, showLoading: false });
  };

  retry = () => {
    if (this.state.autoplayBlocked && this.video) {
      // Invoke play directly inside the user's click, as required by mobile autoplay policy.
      this.video.play()?.catch(this.onError);
      this.props.dispatch(play(this.props.desiredPlaySpeed || 1));
      this.setState({ videoError: null, autoplayBlocked: false });
      return;
    }
    // Preserve the requested/current offset across the remount.
    this.detach();
    this.setState(({ retry }) => ({ retry: retry + 1, videoError: null }));
  };

  render() {
    const { currentRoute, desiredPlaySpeed, isMuted } = this.props;
    const { videoError, retry, showLoading } = this.state;
    const src = currentRoute ? api.video.getQcameraStreamUrl(currentRoute.fullname,
      currentRoute.share_exp, currentRoute.share_sig) : null;
    const start = Math.max(0, ((this.props.offset ?? this.props.loop?.startTime ?? 0)
      - (currentRoute?.videoStartOffset || 0)) / 1000);
    return (
      <div className="min-h-[200px] relative max-w-[964px] m-[0_auto] aspect-[1.593]">
        {(videoError || showLoading) && <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#16181AAA]">
          {videoError ? <><ErrorOutline /><Typography>{videoError}</Typography>
            <Button onClick={this.retry} style={{ color: Colors.white }}>Retry</Button></>
            : <CircularProgress style={{ color: Colors.white }} size={50} />}
        </div>}
        {src && <ReactPlayer key={`${src}:${retry}`} ref={this.videoPlayer} url={src} playsinline muted={isMuted}
          width="100%" height="100%" playing={Boolean(desiredPlaySpeed && !videoError)}
          playbackRate={Math.max(0.25, Math.min(desiredPlaySpeed || 1, 16))}
          config={{ hlsVersion: '1.4.8', hlsOptions: { maxBufferLength: 40, startPosition: start } }}
          onReady={this.onReady} onBuffer={() => this.observe(true)} onBufferEnd={() => this.observe(false)}
          onPlay={() => this.observe(false)} onPause={this.onPause} onEnded={this.onEnded} onError={this.onError} />}
      </div>
    );
  }
}

export default connect((state) => ({
  desiredPlaySpeed: state.desiredPlaySpeed, offset: state.offset, seekRevision: state.seekRevision,
  isBufferingVideo: state.isBufferingVideo, currentRoute: state.currentRoute, loop: state.loop,
}))(DriveVideo);
