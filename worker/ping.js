/* THROWAWAY. Task 1 of the migration plan only: it answers one question —
   does Wix serve a static file first and fall through to the Worker, or does
   the Worker get every request? Deleted in Task 2 either way. */
export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    return new Response(
      JSON.stringify({ worker: true, pathname }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
