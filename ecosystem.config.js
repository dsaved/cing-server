module.exports = {
    apps: [{
        name: "CINQ",
        script: "./app.js",
        watch: false,
        env: {
            "NODE_ENV": "development",
        },
        env_production: {
            "NODE_ENV": "production"
        }
    }]
}