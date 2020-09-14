# CAF Receiver

## Getting started

1. Clone repo
2. ```npm ci```
3. Build with ```npm run build```


## Debug on a chromecast

1. Take contents from `dist` and host somewhere publicly accessible (upload to s3 or via `ngrok` for faster turnaround)
2. Create new application on the [google cast console](https://cast.google.com/publish) and point to url form step 1
3. Make sure your chromecast device is registered in the [google cast console](https://cast.google.com/publish/#/devices)
4. Change player config to use newly created application ID from step 2
5. Casting device should now be visible in the chrome remote debugger (`chrome://inspect/#devices`)
6. Whenever you make changes to the sender code you can clear the chromecast cache by calling ```window.location.reload()``` in the chromecast remote debugger


## Troubleshooting

_I've created a new cast application but cannot cast to it_
- Make sure to reboot your chromecast device after creating a new application, otherwise your chromecast might not be able to connect.

_I am not able to play back DRM protected content_
- DRM playback only works if you host the chromecast receiver application via https. (You should see Error code 6001 in the debugger.)