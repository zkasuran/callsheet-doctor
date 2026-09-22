export default {
  providers: [
    {
      // CONVEX_SITE_URL is set automatically on the deployment.
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
