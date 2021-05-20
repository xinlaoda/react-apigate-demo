import { Layout } from '../components/app/layouts';
import { Wrapper } from '../components/app/wrappers';

type LayoutWithWrapper = Layout & Wrapper;

export interface SiteConfig {
  sections: LayoutWithWrapper[];
}

const site: SiteConfig = {
  sections: [
    {
      id: 'header',
      layoutName: 'Dynamic',

      wrap: 'Box',
      heading: 'Amazon 舆情分析演示',

      components: [],
    },

    {
      id: 'streaming',
      layoutName: 'Dynamic',

      wrap: 'Box',
      heading: '舆情分析',

      components: [{ componentName: 'StreamingView' }],
    },

  ],
};

export default site;
