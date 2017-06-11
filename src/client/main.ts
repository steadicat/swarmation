import 'core-js/fn/array/filter';
import 'core-js/fn/array/index-of';
import 'core-js/fn/array/is-array';
import 'core-js/fn/function/bind';
import 'core-js/fn/object/entries';

import {start as fbStart} from './fb';
import {start as playersStart} from './players';

playersStart();
fbStart();
