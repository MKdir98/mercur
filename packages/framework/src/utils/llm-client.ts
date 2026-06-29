import OpenAI from 'openai'

export type FreeLLMApiClientOptions = {
  baseUrl?: string
  apiKey: string
}

export type FreeLLMChatRole = 'system' | 'user' | 'assistant'

export type FreeLLMChatMessage = {
  role: FreeLLMChatRole
  content: string
}

export type FreeLLMChatOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

export type FreeLLMUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type FreeLLMChatResponse = {
  content: string
  model: string
  usage: FreeLLMUsage
}

export class FreeLLMApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FreeLLMApiError'
  }
}

export class FreeLLMApiClient {
  private readonly client: OpenAI

  constructor(options: FreeLLMApiClientOptions) {
    this.client = new OpenAI({
      baseURL: options.baseUrl ?? 'http://localhost:3001/v1',
      apiKey: options.apiKey,
    })
  }

  async chat(
    messages: FreeLLMChatMessage[],
    options: FreeLLMChatOptions = {}
  ): Promise<FreeLLMChatResponse> {
    let response: OpenAI.Chat.ChatCompletion

    try {
      response = await this.client.chat.completions.create({
        model: options.model ?? 'auto',
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
      })
    } catch (error) {
      throw new FreeLLMApiError(
        `FreeLLMAPI request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    const choice = response.choices[0]
    if (!choice?.message?.content) {
      throw new FreeLLMApiError('FreeLLMAPI returned no content')
    }

    return {
      content: choice.message.content,
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    }
  }
}
