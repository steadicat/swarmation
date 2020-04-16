import * as request from 'request';

type FbError = {};
type FbResponse = {};
type FbResponseBody<R> = {
  data: R;
};

function response<R>(cb: (err: FbError | null, body?: FbResponseBody<R>) => void) {
  return (err: FbError, resp: FbResponse, body: FbResponseBody<R>) => {
    if (err) {
      console.log('FB: Error: ' + resp + ' ' + JSON.stringify(body));
      cb(err);
      return;
    }
    console.log('FB: Response: ' + JSON.stringify(body));
    cb(null, body);
  };
}

export function get<R>(
  path: string,
  token: string,
  cb: (err: FbError | null, body?: FbResponseBody<R>) => void
) {
  console.log('FB: Get ' + path);
  request.get(
    {
      uri: 'https://graph.facebook.com/' + path,
      qs: {access_token: token},
      json: true,
    },
    response(cb)
  );
}

export function post<D extends {access_token?: string}, R>(
  path: string,
  token: string,
  data: D,
  cb: (err: FbError | null, body?: FbResponseBody<R>) => void
) {
  data.access_token = token;
  console.log('FB: Post ' + path);
  request.post(
    {
      uri: 'https://graph.facebook.com/' + path,
      form: data,
      json: true,
    },
    response(cb)
  );
}
