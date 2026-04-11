import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Pool } from "pg";

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password123@localhost:5432/school_app"
});

// MCP Server instance
const server = new Server(
  {
    name: "school-app-postgres-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_query",
        description: "Execute a SQL query on the PostgreSQL database",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The SQL query to execute"
            },
            values: {
              type: "array",
              description: "Parameter values for the query (optional)",
              items: { type: ["string", "number", "boolean", "null"] }
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_schema",
        description: "Get the database schema (tables and columns)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_tables",
        description: "List all tables in the database",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

// Handler for tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request;

  if (name === "execute_query") {
    return await executeQuery(args);
  } else if (name === "get_schema") {
    return await getSchema();
  } else if (name === "get_tables") {
    return await getTables();
  } else {
    throw new Error(`Unknown tool: ${name}`);
  }
});

async function executeQuery(args) {
  const { query, values = [] } = args;

  if (!query) {
    throw new Error("Query is required");
  }

  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              rowCount: result.rowCount,
              rows: result.rows,
              command: result.command
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message,
              code: error.code
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  } finally {
    client.release();
  }
}

async function getSchema() {
  const client = await pool.connect();
  try {
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const schema = {};

    // For each table, get columns
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;

      const columnsResult = await client.query(
        `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position
      `,
        [tableName]
      );

      schema[tableName] = columnsResult.rows;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(schema, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  } finally {
    client.release();
  }
}

async function getTables() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        table_name,
        (SELECT count(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error.message
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  } finally {
    client.release();
  }
}

// Start the server
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("School App PostgreSQL MCP Server running on stdio transport");
}

// Handle shutdown
process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
