module.exports = {
  apps: [
    {
      name: "smartup-erp-1",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-1-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-1-out.log",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-erp-2",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-2-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-2-out.log",
      env: {
        PORT: 3005,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-erp-3",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-3-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-3-out.log",
      env: {
        PORT: 3006,
        NODE_ENV: "production"
      }
    },
    {
      name: "smartup-erp-4",
      script: "npm",
      args: "run start",
      cwd: "/var/www/smartup-erp",
      instances: 1,
      exec_mode: "fork",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/root/.pm2/logs/smartup-erp-4-error.log",
      out_file: "/root/.pm2/logs/smartup-erp-4-out.log",
      env: {
        PORT: 3007,
        NODE_ENV: "production"
      }
    }
  ]
};
