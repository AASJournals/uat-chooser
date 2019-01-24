// Copyright 2019 the American Astronomical Society
// Licensed under the MIT License.
//
// Due to the current way in which we build our webpack module, this file is a
// small shim that comes at the end of a concatenation several JavaScript
// files -- see `../package.json`. In particular, this file comes right after
// `./ejp_uat.js` which currently has all of the application-specific code.

import '../src/ejp_uat.css';

import img_indicator_tiny_red from '../img/indicator_tiny_red.gif';
import img_info_select from '../img/info_select.png';
import img_taxonomyterms_miss from '../img/taxonomyterms_miss.png';
import img_vsubmit_close from '../img/vsubmit_close.png';
import img_vsubmit_status_error from '../img/vsubmit_status_error.png';

export default { ejpUatAutocompleterInit };
