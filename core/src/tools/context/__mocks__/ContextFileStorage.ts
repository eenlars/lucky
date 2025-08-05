export class ContextFileStorage {
  protected bucket: string

  constructor(bucket: string = "context") {
    this.bucket = bucket
  }

  upload = jest.fn()
  download = jest.fn()
  update = jest.fn()
  list = jest.fn()
  delete = jest.fn()
  getPublicUrl = jest.fn()
  createSignedUrl = jest.fn()
}
