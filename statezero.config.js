export const BASE_URL = "http://127.0.0.1:8000";

export default {
  backendConfigs: {
    default: {
      API_URL: `${BASE_URL}/statezero`,
      GENERATED_TYPES_DIR: "./src/models/",
      fileRootURL: BASE_URL,
      fileUploadMode: "server",
      BACKEND_TZ: "UTC",
      events: {
        type: "pusher",
        pusher: {
          clientOptions: {
            appKey: null,
            cluster: null,
            forceTLS: true,
            authEndpoint: `${BASE_URL}/statezero/events/auth/`,
          },
        },
      },
    },
  },
};