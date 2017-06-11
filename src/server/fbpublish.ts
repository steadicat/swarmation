import * as config from '../config';
import {getFormations} from '../formations';
import * as fb from './fb';

const formations = getFormations();

for (const id in formations) {
  const formation = formations[id];

  // register achievements with FB
  fb.post(
    config.appId + '/achievements',
    config.token,
    {achievement: 'http://swarmation.com/formation/' + formation.name},
    (err, res) => {
      if (err) throw err;
      console.log('FB: Registered formation ' + formation.name);
    }
  );
}
