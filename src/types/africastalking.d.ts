declare module "africastalking" {
  type AfricasTalkingCredentials = {
    apiKey: string
    username: string
  }

  type SmsOptions = {
    to: string | string[]
    message: string
    senderId?: string
    enqueue?: boolean
  }

  type AfricasTalkingClient = {
    SMS: {
      send(options: SmsOptions): Promise<unknown>
    }
  }

  function AfricasTalking(credentials: AfricasTalkingCredentials): AfricasTalkingClient

  export default AfricasTalking
}
