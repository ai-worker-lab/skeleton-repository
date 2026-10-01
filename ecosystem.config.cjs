const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'app-skeleton-api',
      cwd: root,
      script: 'pnpm',
      args: ['--filter', '@app-skeleton/api', 'start:dev'],
      interpreter: 'none',
      autorestart: false,
    },
    {
      name: 'app-skeleton-web',
      cwd: root,
      script: 'pnpm',
      args: ['--filter', '@app-skeleton/web', 'start'],
      interpreter: 'none',
      autorestart: false,
    },
    {
      name: 'app-skeleton-app',
      cwd: root,
      script: 'pnpm',
      args: ['--filter', '@app-skeleton/app', 'start'],
      interpreter: 'none',
      env: { CI: 'false' },
      autorestart: false,
    },
  ],
};
