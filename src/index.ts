import { CastReceiverContext, ContentProtection, NetworkRequestInfo, PlayerManager } from 'chromecast-caf-receiver/cast.framework';
import { LoadRequestData } from 'chromecast-caf-receiver/cast.framework.messages';
import { CAFDrmConfig, CAFMediaInfoCustomData, CAFSourceOptions } from 'bitmovin-player';

const CAST_MESSAGE_NAMESPACE = 'urn:x-cast:com.bitmovin.player.cast';

export interface RemoteControlReceiverMessage {
  type: RemoteControlReceiverMessageType;
  data: any;
}

export enum RemoteControlReceiverMessageType {
  PlayerState,
  PlayerEvent,
  PlayerGetterCallReturnValue,
}

export enum PlayerEvent {
  Playing = 'playing',
  Seek = 'seek',
  Seeked = 'seeked',
}

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
    this.player.addEventListener(cast.framework.events.EventType.PLAYING, () => this.relayPlayerEvent(PlayerEvent.Playing));
    this.player.addEventListener(cast.framework.events.EventType.REQUEST_SEEK, () => this.relayPlayerEvent(PlayerEvent.Seek));
    this.player.addEventListener(cast.framework.events.EventType.SEEKED, () => this.relayPlayerEvent(PlayerEvent.Seeked));
    this.context.addCustomMessageListener(CAST_MESSAGE_NAMESPACE, this.onCustomMessage);
  }

  private readonly onLoad = (loadRequestData: LoadRequestData): LoadRequestData => {
    const customData = loadRequestData.media.customData as CAFMediaInfoCustomData;

    if (customData?.options) {
      this.setWithCredentials(customData.options);
    }

    if (customData?.drm) {
      this.setDRM(customData.drm);
    }

    return loadRequestData;
  };

  private setDRM({ protectionSystem, licenseUrl, headers, withCredentials }: CAFDrmConfig): void {
    this.context.getPlayerManager().setMediaPlaybackInfoHandler((_loadRequest, playbackConfig) => {
      playbackConfig.licenseUrl = licenseUrl;
      playbackConfig.protectionSystem = protectionSystem as ContentProtection;

      if (typeof headers === 'object') {
        playbackConfig.licenseRequestHandler = (requestInfo) => {
          requestInfo.headers = headers;
        };
      }

      if (withCredentials) {
        playbackConfig.licenseRequestHandler = setWithCredentialsFlag;
      }

      return playbackConfig;
    });
  }

  private setWithCredentials(options: CAFSourceOptions): void {
    const playerManager = this.context.getPlayerManager();
    const playbackConfig = Object.assign(new cast.framework.PlaybackConfig(), playerManager.getPlaybackConfig());

    if (options.withCredentials) {
      playbackConfig.segmentRequestHandler = setWithCredentialsFlag;
      playbackConfig.captionsRequestHandler = setWithCredentialsFlag;
    }

    if (options.manifestWithCredentials) {
      playbackConfig.manifestRequestHandler = setWithCredentialsFlag;
    }

    playerManager.setPlaybackConfig(playbackConfig);
  }

  private relayPlayerEvent(event: PlayerEvent): void {
    const playerEventMessage: RemoteControlReceiverMessage = {
      type: RemoteControlReceiverMessageType.PlayerEvent,
      data: { event },
    };
    
    this.context.sendCustomMessage(CAST_MESSAGE_NAMESPACE, undefined, playerEventMessage);
  };

  private readonly onCustomMessage = (message: cast.framework.system.Event) => {
    console.log('Received custom channel message', message);
  };
}

function setWithCredentialsFlag(requestInfo: NetworkRequestInfo): void {
  requestInfo.withCredentials = true;
}
