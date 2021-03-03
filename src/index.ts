import { CastReceiverContext, NetworkRequestInfo, PlayerManager } from 'chromecast-caf-receiver/cast.framework';
import { LoadRequestData } from 'chromecast-caf-receiver/cast.framework.messages';

const CAST_MESSAGE_NAMESPACE = 'urn:x-cast:com.bitmovin.player.caf';

export default class CAFReceiver {
  private readonly player: PlayerManager;
  private readonly context: CastReceiverContext;

  constructor() {
    this.context = cast.framework.CastReceiverContext.getInstance();
    this.player = this.context.getPlayerManager();
  }

  public init() {
    // cast.framework.CastReceiverContext.getInstance().setLoggerLevel(cast.framework.LoggerLevel.DEBUG);

    this.attachEvents();
    this.context.start();
  }

  private attachEvents() {
    this.player.setMessageInterceptor(cast.framework.messages.MessageType.LOAD, this.onLoad);
    this.context.addCustomMessageListener(CAST_MESSAGE_NAMESPACE, this.onCustomMessage);
  }

  // Setup DRM if present in `media.customData`
  private readonly onLoad = (loadRequestData: LoadRequestData): LoadRequestData => {
    if (loadRequestData.media.customData) {
      if (loadRequestData.media.customData.options) {
        this.setWithCredentials(loadRequestData.media.customData.options);
      }

      if (loadRequestData.media.customData.drm) {
        return this.setDRM(loadRequestData);
      }
    }

    return loadRequestData;
  }

  private setDRM(loadRequestData: LoadRequestData): LoadRequestData {
    const protectionSystem = loadRequestData.media.customData.drm.protectionSystem;
    const licenseUrl = loadRequestData.media.customData.drm.licenseUrl;
    const withCredentials = loadRequestData.media.customData.drm.withCredentials;

    this.context.getPlayerManager().setMediaPlaybackInfoHandler((_loadRequest, playbackConfig) => {
      playbackConfig.licenseUrl = licenseUrl;
      playbackConfig.protectionSystem =  protectionSystem;

      if (typeof loadRequestData.media.customData.drm.headers === 'object') {
        playbackConfig.licenseRequestHandler = requestInfo => {
          requestInfo.headers = loadRequestData.media.customData.drm.headers;
        };
      }

      if (withCredentials) {
        playbackConfig.licenseRequestHandler = setWithCredentialsFlag;
      }

      return playbackConfig;
    });

    return loadRequestData;
  }

  private setWithCredentials(options): void {
    const playerManager = this.context.getPlayerManager();
    const playbackConfig = Object.assign(new cast.framework.PlaybackConfig(), playerManager.getPlaybackConfig());

    if (options.withCredentials) {
      playbackConfig.manifestRequestHandler = setWithCredentialsFlag;
    }

    if (options.manifestWithCredentials) {
      playbackConfig.segmentRequestHandler = setWithCredentialsFlag;
    }

    playerManager.setPlaybackConfig(playbackConfig);
  }

  private readonly onCustomMessage = (message: cast.framework.system.Event) => {
    console.log('Received custom channel message', message);
  }
}

function setWithCredentialsFlag(requestInfo: NetworkRequestInfo): void {
  requestInfo.withCredentials = true;
}
