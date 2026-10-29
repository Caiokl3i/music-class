// Vercel Serverless Function entrypoint bridge
// Forwards incoming HTTP requests to the compiled AdonisJS serverless handler

export default async function handler(req, res) {
  const { default: handle } = await import('../build/bin/serverless.js')
  return handle(req, res)
}
