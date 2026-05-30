import type { AnimModule } from '~/lib/anim/types';
import { mountDsa } from '~/lib/anim/dsa-bridge';
import meta from './meta';

const mod: AnimModule = {
  ...meta,
  mount(host) {
    return mountDsa(host, 'single-number-xor');
  },
};

export default mod;
