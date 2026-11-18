/** The one shared, mutable state object of the page. */
export const state = {
  pid: location.hash.slice(1) || null,
  project: null, // latest project state from the server
  config: null, // /api/config
  briefMode: "story", // which "new reel" form is shown: story or product
  timer: null, // polling timer
};
