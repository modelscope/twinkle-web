// Single source of site-wide facts shared by layouts, home page and scripts.
export const site = {
  name: 'SWIFT',
  siteUrl: 'https://modelscope.github.io/twinkle-web',
  repos: {
    swift: 'https://github.com/modelscope/ms-swift',
    twinkle: 'https://github.com/modelscope/twinkle',
    webui: 'https://github.com/modelscope/ms-webui',
  },
  discord: 'https://discord.gg/yeN59wxjwe',
  modelscope: 'https://modelscope.cn',
  // Assets copied from the ms-swift repo by scripts/prepare-content.mjs.
  wechatQr: '/images/wechat.png',
  discordQr: '/images/discord_qr.jpg',
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefix a public asset path with the deployment base path. */
export function asset(path: string): string {
  return `${basePath}${path}`;
}

export const citation = `@misc{zhao2024swiftascalablelightweightinfrastructure,
      title={SWIFT:A Scalable lightWeight Infrastructure for Fine-Tuning},
      author={Yuze Zhao and Jintao Huang and Jinghan Hu and Xingjun Wang and Yunlin Mao and Daoze Zhang and Zeyinzi Jiang and Zhikai Wu and Baole Ai and Ang Wang and Wenmeng Zhou and Yingda Chen},
      year={2024},
      eprint={2408.05517},
      archivePrefix={arXiv},
      primaryClass={cs.CL},
      url={https://arxiv.org/abs/2408.05517},
}`;
