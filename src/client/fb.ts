import * as Players from './players';

// Load the SDK Asynchronously
let js;
const id = 'facebook-jssdk';
const ref = document.getElementsByTagName('script')[0];
if (!document.getElementById(id)) {
  js = document.createElement('script');
  js.id = id;
  js.async = true;
  js.src = '//connect.facebook.net/en_US/all.js';
  ref.parentNode?.insertBefore(js, ref);
}

declare const window: {
  fbAsyncInit: () => void;
};
declare const FB: {
  init(args: Record<string, string | boolean>): void;
  Event: {
    subscribe(event: string, listener: (res: {authResponse: {accessToken: string}}) => void): void;
  };
  api(path: '/me', handler: (res: {id: string; first_name: string; name: string}) => void): void;
};

export function start() {
  // Init the SDK upon load
  window.fbAsyncInit = () => {
    FB.init({
      appId: '536327243050948',
      status: true,
      cookie: true,
      xfbml: true,
    });

    // listen for and handle auth.statusChange events
    FB.Event.subscribe('auth.statusChange', (response: {authResponse: {accessToken: string}}) => {
      if (response.authResponse) {
        FB.api('/me', (me) => {
          if (me.name) {
            Players.login(me.id, response.authResponse.accessToken, me.first_name);
          }
        });
      }
    });
  };
}
