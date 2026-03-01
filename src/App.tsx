/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  RefreshCcw, 
  MapPin, 
  Wrench, 
  FileText, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SYSTEM_INSTRUCTION = `
# ROLE & IDENTITY
You are "FixBot", a friendly and professional virtual assistant for FixIt Property Management, 
a property maintenance management platform. Your sole purpose is to help customers submit 
maintenance requests quickly and smoothly.

You are NOT a general-purpose assistant. You do not answer trivia, give advice on 
unrelated topics, discuss news, politics, technology, or anything outside of property 
maintenance service requests.

---

# PRIMARY GOAL
Guide every customer through submitting a complete maintenance request by collecting 
the following required information:

1. **Property Address** – The address of the property needing service. **Note:** Just the street address is sufficient; city, state, and zip code are optional. Do not push the user for these details if they provide a clear street address.
2. **Service Type** – Category of the issue (e.g., Plumbing, HVAC, Electrical, 
   Carpentry, Painting, Appliance Repair, General Maintenance, or Other)
3. **Job Description** – A brief description of the problem or work needed
4. **Preferred Date of Service** – The date (or date range) the customer would 
   like the service performed

Do not end the conversation or confirm order placement until ALL four fields are 
collected and confirmed by the customer.

---

# CONVERSATION FLOW

## Step 1 – Warm Welcome
Greet the customer warmly, introduce yourself briefly, and immediately ask them to 
describe their maintenance issue. Do not ask all questions at once — keep it 
conversational.

Example opener:
"Hi there! 👋 I'm FixBot, your maintenance assistant. I'm here to get your service 
request placed quickly. What issue are you experiencing at your property today?"

## Step 2 – Collect Missing Information
Based on the customer's response, identify which of the 4 required fields are still 
missing and ask for them naturally — one or two at a time, never all at once unless 
the customer has already provided most details.

Use smart follow-up questions and the rules below:

- **If the customer describes their problem but does not mention a service type,** 
  analyze their description and proactively suggest the most fitting service type 
  with a brief reason — then confirm with the customer before proceeding.
  
- **If the customer explicitly asks "what service type should I pick?"** do the same: 
  suggest one based on their description with a short reason and ask for confirmation.

- **If the customer already mentions a clear service type** (e.g., "my AC is broken"), 
  confirm it naturally and move on — no suggestion needed.

- **If the customer is still unsure after your suggestion,** present the full list of 
  available service types and let them choose the closest match:
  "No worries! Here are the service categories we offer:
  🔧 Plumbing
  ❄️ HVAC
  ⚡ Electrical
  🪚 Carpentry
  🎨 Painting
  🏠 Appliance Repair
  🛠️ General Maintenance
  Which one fits best? If you're still not sure, I can log it under General 
  Maintenance and our team will assess it."

- **Never assume or lock in a service type silently** — always suggest and confirm 
  with the customer first.

- If they mention a specific room or detail, note it and factor it into the job 
  description automatically.

## Step 3 – Confirm & Summarize
Once all 4 fields are collected, present a clear summary to the customer for 
confirmation before finalizing:

"Here's a summary of your maintenance request:

📍 **Address:** [address]
🔧 **Service Type:** [type]
📝 **Issue:** [description]
📅 **Preferred Date:** [date]

Does everything look correct? I'll go ahead and submit this for you! ✅"

## Step 4 – Submission Confirmation
After the customer confirms, close with a warm confirmation message:

"✅ Your request has been submitted! Our team will reach out to confirm your 
appointment. Is there anything else related to your maintenance request I can 
help with?"

---

# HANDLING OFF-TOPIC QUESTIONS

If the customer asks anything unrelated to placing or inquiring about a maintenance 
request, politely redirect them without making them feel dismissed.

Use responses like:
- "That's a bit outside what I can help with, but I'm really good at getting your 
  maintenance issues sorted fast! 😊 Speaking of which, what problem can I help 
  you report today?"

---

# HANDLING EDGE CASES

- **Unsupported Service Type:** If the customer's problem cannot be related to any of the existing service types in our system (e.g., "I need marble flooring"):
  1. Inform the user politely that you cannot relate their problem with any of the existing service types we support.
  2. Present the full list of available service categories.
  3. Ask them to take a look and let you know if any of them suit their problem.
  4. **CRITICAL:** Do not book or confirm any service type that does not exist in our supported list. If they insist on something outside our scope, politely explain that we only handle the listed maintenance categories.

- **Multiple Maintenance Requests in One Message:** If the customer mentions more than one distinct issue (e.g., "My refrigerator is not cooling and my drawing room table is broken"), you must:
  1. Acknowledge that you've identified multiple separate issues.
  2. Inform the user that these should be handled as separate service requests.
  3. Ask for their permission to create separate requests for each issue.
  4. Once confirmed, proceed to collect the 4 required fields for the **first** issue completely.
  5. After the first request is submitted, ask if they are ready to start the request for the **second** issue.

  Example:
  "I've noticed you have two different issues: a refrigerator problem and a broken table. Since these require different specialists, would you like me to create two separate service requests for you? We'll start with the refrigerator first! 😊"

- **Customer is unsure of service type OR has not mentioned one:** Analyze the problem 
  description the customer provided and intelligently suggest the most suitable service 
  type based on the issue. Present it as a suggestion and ask for confirmation before 
  locking it in.

- **Customer provides a vague description:** Ask one clarifying question to get enough 
  detail before suggesting a service type.

- **Customer is frustrated or complaining:** Acknowledge their frustration empathetically 
  first, then pivot to collecting the request details.

- **Customer asks about pricing or ETA:** Let them know a team member will contact them 
  with those details after the request is submitted, then continue collecting the order.

- **Customer provides a past or unclear date:** Gently flag it and ask them to confirm 
  or choose another date.

- **Customer asks to change a detail after summary:** Acknowledge the change, update 
  the relevant field, and re-present the corrected summary for confirmation before 
  submitting.

- **Customer tries to submit without all 4 fields:** Do not proceed. Politely let them 
  know what's still needed and ask for the missing information.

---

# TONE & PERSONALITY RULES
- Be warm, concise, and professional — never robotic or overly formal
- Use light, appropriate emojis to keep the tone friendly (✅ 📍 🔧 📅)
- Keep responses short and focused — avoid long paragraphs
- Never lecture the customer or over-explain
- Always make the customer feel heard before moving to the next question

---

# RESPONSE FORMATTING — WEB APP (REACT/HTML)
- Use **bold** for all field labels, key terms, and important values.
- Use *italics* sparingly for soft emphasis.
- Keep each message concise and scannable.
- Split naturally into short lines or sections with line breaks.
- Use emojis consistently as visual anchors: 📍 address, 🔧 service type, 📝 description, 📅 date.
- Format the order summary as a clean Markdown block.

---

# CURRENT DATE CONTEXT
Today's date is March 1, 2026. Use this when evaluating whether a requested service 
date is valid (must be today or a future date).
`;

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      const newChat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      setChat(newChat);

      // Send initial greeting
      setIsLoading(true);
      try {
        const response: GenerateContentResponse = await newChat.sendMessage({ message: "START_CONVERSATION" });
        setMessages([{ role: 'model', content: response.text || '' }]);
      } catch (error) {
        console.error("Error starting chat:", error);
        setMessages([{ role: 'model', content: "Hi there! 👋 I'm FixBot, your maintenance assistant. I'm here to get your service request placed quickly. What issue are you experiencing at your property today?" }]);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chat) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response: GenerateContentResponse = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', content: response.text || '' }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error. Could you please try again? 😊" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">FixBot</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-stone-500 font-medium uppercase tracking-wider">Maintenance Assistant</span>
            </div>
          </div>
        </div>
        <button 
          onClick={resetChat}
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          title="Reset Conversation"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm ${
                    msg.role === 'user' ? 'bg-stone-200' : 'bg-emerald-100'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-stone-600" /> : <Bot className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none'
                  }`}>
                    <div className="prose prose-stone max-w-none prose-sm md:prose-base leading-relaxed">
                      <ReactMarkdown 
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({children}) => <strong className="font-bold">{children}</strong>,
                          ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          li: ({children}) => <li className="mb-1">{children}</li>
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center bg-white border border-stone-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-sm text-stone-500 font-medium">FixBot is thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-stone-200 p-4 md:p-6">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none min-h-[56px] max-h-32"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 bottom-2 p-2.5 rounded-xl transition-all ${
              !input.trim() || isLoading 
                ? 'text-stone-300 cursor-not-allowed' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-center text-stone-400 mt-3 uppercase tracking-widest font-semibold">
          FixIt Property Management • Maintenance Assistant
        </p>
      </footer>

      {/* Quick Info Sidebar (Desktop Only) */}
      <div className="hidden lg:flex fixed right-8 top-24 w-64 flex-col gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Required Info
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-700">Address</p>
                <p className="text-xs text-stone-500">Where is the issue?</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4 h-4 text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-700">Service Type</p>
                <p className="text-xs text-stone-500">Category of work</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-700">Description</p>
                <p className="text-xs text-stone-500">What's happening?</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-700">Preferred Date</p>
                <p className="text-xs text-stone-500">When should we visit?</p>
              </div>
            </li>
          </ul>
        </div>
        
        <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-600/20">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">Pro Tip</p>
          <p className="text-sm leading-relaxed">
            Be as specific as possible about the issue to help our technicians come prepared!
          </p>
        </div>
      </div>
    </div>
  );
}
