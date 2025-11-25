import OpenAI from 'openai'
import { POData } from './types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Return only the raw text content without any formatting or explanation.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    })

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error extracting text from image:', error)
    throw new Error('Failed to extract text from image')
  }
}

export async function extractPOData(text: string): Promise<POData> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a data extraction specialist. Extract purchase order line items from the provided text.
          
Return ONLY a valid JSON object in this exact format:
{
  "items": [
    {
      "name": "product name",
      "quantity": "quantity as string or number",
      "cost": "unit cost as string or number",
      "usd": "total USD amount as string or number",
      "poNo": "PO number"
    }
  ]
}

Rules:
- Extract EVERY line item, do not skip any
- If lines are broken, merge them correctly
- If a field is missing, use empty string
- Return ONLY valid JSON, no explanations or markdown
- Do not wrap in code blocks`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content) as POData
    
    // Validate and clean data
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid data structure')
    }

    // Clean and normalize the data
    parsed.items = parsed.items.map((item, index) => ({
      no: index + 1,
      name: item.name || '',
      quantity: cleanNumber(item.quantity),
      cost: cleanNumber(item.cost),
      poNo: item.poNo || '',
      usd: cleanNumber(item.usd),
    }))

    return parsed
  } catch (error) {
    console.error('Error extracting PO data:', error)
    throw new Error('Failed to extract PO data')
  }
}

function cleanNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    // Remove commas and other non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }
  return 0
}
