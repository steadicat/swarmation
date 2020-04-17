import {getFormations} from '../formations';
import * as fb from './fb';
import * as dotenv from 'dotenv';
dotenv.config();

const formations = getFormations();

for (const id in formations) {
  const formation = formations[id];

  // register achievements with FB
  fb.post(
    process.env.FB_APP_ID + '/achievements',
    process.env.FB_TOKEN,
    {achievement: 'http://swarmation.com/formation/' + formation.name},
    (err) => {
      if (err) throw err;
      console.log('FB: Registered formation ' + formation.name);
    }
  );
}
