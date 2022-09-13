import express from 'express'

function main() {
  const PORT = process.env.PORT || 8080
  const app = express()

  app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
  })
}

if (require.main === module) main()

export default main
