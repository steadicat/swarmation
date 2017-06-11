import * as request from 'request';
import * as util from 'util';

function response(cb) {
  return (err, resp, body) => {
    if (err) {
      console.log('FB: Error: ' + resp + ' ' + JSON.stringify(body));
      return cb(err);
    }
    console.log('FB: Response: ' + JSON.stringify(body));
    cb(null, body);
  };
}

export function get(path, token, cb) {
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

export function post(path, token, data, cb) {
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
