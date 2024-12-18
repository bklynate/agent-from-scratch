import { JSONFilePreset } from 'lowdb/node'; // LowDB is a lightweight JSON database for local storage
import type { AIMessage } from 'types'; // AIMessage type defines the structure of messages (e.g., role, content)
import { v4 as uuidv4 } from 'uuid'; // Generates unique IDs for each message

/**
 * Represents a message that includes additional metadata.
 * @typedef {AIMessage} MessageWithMetadata
 * @property {string} id - A unique identifier for each message.
 * @property {string} createdAt - The timestamp indicating when the message was created.
 */
export type MessageWithMetadata = AIMessage & {
  id: string;
  createdAt: string;
};

/**
 * Adds metadata (unique ID and timestamp) to a message.
 *
 * @param {AIMessage} message - The original message.
 * @returns {MessageWithMetadata} A new message object with added metadata.
 *
 * @why
 * Adding metadata allows tracking each message uniquely. The `id` ensures
 * uniqueness for retrieval or updates, and `createdAt` timestamps provide
 * historical context for sorting or analysis.
 */
export const addMetadata = (message: AIMessage): MessageWithMetadata => ({
  ...message,
  id: uuidv4(), // Generate a unique identifier for the message
  createdAt: new Date().toISOString(), // Timestamp in ISO format
});

/**
 * Removes metadata from a message.
 *
 * @param {MessageWithMetadata} message - A message that includes metadata.
 * @returns {AIMessage} The original message without metadata.
 *
 * @why
 * Metadata is useful for internal storage and tracking, but it's often unnecessary
 * or redundant for external use cases like UI display or API responses.
 */
export const removeMetadata = (message: MessageWithMetadata): AIMessage => {
  const { id, createdAt, ...messageWithoutMetadata } = message; // Destructure and exclude metadata
  return messageWithoutMetadata;
};

/**
 * Defines the database structure.
 *
 * @typedef {Object} Data
 * @property {MessageWithMetadata[]} messages - A list of messages, each with metadata.
 */
type Data = {
  messages: MessageWithMetadata[];
};

// Default database structure, used when initializing a new database
const defaultData: Data = { messages: [] };

/**
 * Initializes and retrieves the LowDB instance for storing messages.
 *
 * @returns {Promise<Low>} The database instance with a predefined structure.
 *
 * @why
 * The LowDB instance is lightweight, flexible, and uses a simple JSON file for persistence,
 * making it perfect for local storage or prototyping without a full database setup.
 */
export const getDb = async () => {
  const db = await JSONFilePreset<Data>('db.json', defaultData); // Specify DB file and default data
  return db;
};

/**
 * Adds multiple messages to the database, each with its own metadata.
 *
 * @param {AIMessage[]} messages - An array of raw messages to be stored.
 * @returns {Promise<void>} A promise that resolves when the operation completes.
 *
 * @why
 * Persisting messages ensures a reliable history of interactions, and
 * adding metadata enhances message traceability and uniqueness.
 */
export const addMessages = async (messages: AIMessage[]) => {
  const db = await getDb(); // Retrieve the database instance
  const messagesWithMetadata = messages.map(addMetadata); // Add metadata to each message
  db.data.messages.push(...messagesWithMetadata); // Append new messages to the existing ones
  await db.write(); // Persist changes to the JSON file
};

/**
 * Retrieves all messages from the database, excluding their metadata.
 *
 * @returns {Promise<AIMessage[]>} An array of messages without metadata.
 *
 * @why
 * While metadata is valuable internally, most consumers of the data (e.g., UI components)
 * only care about the core content of the messages.
 */
export const getMessages = async () => {
  const db = await getDb(); // Retrieve the database instance
  return db.data.messages.map(removeMetadata); // Return messages without metadata
};

/**
 * Saves the response of a tool (function) call to the message history.
 *
 * @param {string} toolCallId - The unique identifier for the tool call.
 * @param {string} toolResponse - The result or output generated by the tool, serialized as a string.
 *
 * @returns {Promise<void>} - A promise that resolves once the tool response is saved.
 *
 * @description
 * This function stores the result of a tool's execution as a message in the database.
 * The saved message is tagged with a `tool` role and includes the `tool_call_id` to ensure
 * traceability and context alignment between the original tool call and its response.
 *
 * @example
 * Save a response for a tool call with ID 'call_123'
 * await saveToolResponse('call_123', '{"result":"data fetched successfully"}');
 *
 * @why
 * Storing tool responses in the message history ensures the conversational context
 * remains intact, allowing the AI to reference or build upon these results in future interactions.
 * It also provides a clear link between tool calls and their corresponding outputs.
 */
export const saveToolResponse = async (
  toolCallId: string,
  toolResponse: string | any
) => {
  return await addMessages([
    { role: 'tool', content: toolResponse, tool_call_id: toolCallId },
  ]);
};
