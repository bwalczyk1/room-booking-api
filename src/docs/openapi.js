// Opis API w formacie OpenAPI 3.0 - Swagger UI pod /api/docs generuje z niego interaktywną dokumentację
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const json = schema => ({ "application/json": { schema } });
const body = name => ({ required: true, content: json(ref(name)) });
const response = (description, schemaName) => ({ description, content: json(ref(schemaName)) });

// Każdy błąd ma ten sam format - schemat Error jest zdefiniowany raz i używany przez $ref
const error = description => ({ description, content: json(ref("Error")) });

const idParam = resource => ({
  name: "id",
  in: "path",
  required: true,
  description: `${resource} ID`,
  schema: { type: "integer", minimum: 1 }
});

const queryParam = (name, schema, description) => ({ name, in: "query", required: false, description, schema });

const unauthorized = error("Missing, malformed, invalid or expired token (UNAUTHORIZED, INVALID_TOKEN, TOKEN_EXPIRED)");
const adminOnly = error("Authenticated, but not ADMIN (FORBIDDEN)");
const invalidId = error("Invalid id (VALIDATION_ERROR)");

const timestamp = { type: "string", format: "date-time" };

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Room Booking API",
    version: "5.0.0",
    description: "Rezerwacje sal. Zaloguj się (POST /api/auth/login), kliknij Authorize i wklej accessToken."
  },
  // Domyślnie każdy endpoint wymaga tokenu; register i login nadpisują to pustym security
  security: [{ bearerAuth: [] }],
  tags: [{ name: "Auth" }, { name: "Buildings" }, { name: "Rooms" }, { name: "Reservations" }, { name: "Audit log" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Validation failed" },
              details: {
                type: "array",
                description: "Only for VALIDATION_ERROR",
                items: {
                  type: "object",
                  properties: {
                    location: { type: "string", enum: ["params", "query", "body"] },
                    field: { type: "string", example: "password" },
                    message: { type: "string", example: "Password must have at least 10 characters" }
                  }
                }
              },
              requestId: { type: "string", format: "uuid" }
            }
          }
        }
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", example: "Ewa.Mazur@example.com" },
          password: { type: "string", minLength: 10, maxLength: 72, example: "bardzo-dlugie-haslo" }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", example: "jan.kowalski@example.com" },
          password: { type: "string", example: "user-password-123" }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { type: "string", example: "15m" }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 7 },
          email: { type: "string", example: "ewa.mazur@example.com" },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          createdAt: timestamp
        }
      },
      Building: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "Budynek A" },
          address: { type: "string", example: "ul. Warszawska 24, Kraków" },
          roomsCount: { type: "integer", example: 3 }
        }
      },
      BuildingCreate: {
        type: "object",
        required: ["name", "address"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100, example: "Budynek D" },
          address: { type: "string", minLength: 5, maxLength: 200, example: "ul. Kamienna 12, Kraków" }
        }
      },
      BuildingUpdate: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          address: { type: "string", minLength: 5, maxLength: 200 }
        }
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "101" },
          capacity: { type: "integer", example: 30 },
          building: {
            type: "object",
            properties: { id: { type: "integer" }, name: { type: "string" } }
          }
        }
      },
      RoomCreate: {
        type: "object",
        required: ["buildingId", "name", "capacity"],
        additionalProperties: false,
        properties: {
          buildingId: { type: "integer", minimum: 1, example: 3 },
          name: { type: "string", minLength: 1, maxLength: 50, example: "101" },
          capacity: { type: "integer", minimum: 1, example: 40 }
        }
      },
      RoomUpdate: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          capacity: { type: "integer", minimum: 1 }
        }
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "integer", example: 2 },
          room: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              building: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" } } }
            }
          },
          user: {
            type: "object",
            properties: { id: { type: "integer" }, email: { type: "string" } }
          },
          participants: { type: "integer", example: 20 },
          startTime: timestamp,
          endTime: timestamp,
          status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          createdAt: timestamp,
          cancelledAt: { ...timestamp, nullable: true }
        }
      },
      ReservationCreate: {
        type: "object",
        required: ["roomId", "participants", "startTime", "endTime"],
        additionalProperties: false,
        description: "The owner comes from the token - userId or reservedBy in the body gives 400",
        properties: {
          roomId: { type: "integer", minimum: 1, example: 3 },
          participants: { type: "integer", minimum: 1, example: 20 },
          startTime: { ...timestamp, example: "2026-12-15T10:00:00Z" },
          endTime: { ...timestamp, example: "2026-12-15T12:00:00Z" }
        }
      },
      ReservationPage: {
        type: "object",
        properties: {
          data: { type: "array", items: ref("Reservation") },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" }
            }
          }
        }
      },
      AuditLogEntry: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          eventType: { type: "string", enum: ["reservation.created", "reservation.cancelled"] },
          payload: {
            type: "object",
            description: "Event data - fields depend on eventType",
            example: { reservationId: 6, roomId: 1, userId: 2, cancelledBy: 1 }
          },
          createdAt: timestamp
        }
      },
      AuditLogPage: {
        type: "object",
        properties: {
          data: { type: "array", items: ref("AuditLogEntry") },
          meta: { $ref: "#/components/schemas/ReservationPage/properties/meta" }
        }
      }
    }
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new account (always role USER)",
        security: [],
        requestBody: body("RegisterRequest"),
        responses: {
          201: response("Created user (without password hash)", "User"),
          400: error("Invalid email, password shorter than 10 / longer than 72, unknown field such as role, invalid JSON"),
          409: error("Email already registered (EMAIL_TAKEN), also for concurrent registrations")
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and get a JWT access token",
        security: [],
        requestBody: body("LoginRequest"),
        responses: {
          200: response("Access token (HS256, claims: sub, role, iat, exp)", "LoginResponse"),
          400: error("Invalid body (VALIDATION_ERROR, INVALID_JSON)"),
          401: error("Wrong email or wrong password - the same response for both (INVALID_CREDENTIALS)")
        }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        responses: {
          200: response("Logged in user (without password hash)", "User"),
          401: unauthorized,
          404: error("The account from the token no longer exists")
        }
      }
    },
    "/api/buildings": {
      get: {
        tags: ["Buildings"],
        summary: "List buildings with roomsCount",
        responses: {
          200: { description: "Buildings", content: json({ type: "array", items: ref("Building") }) },
          401: unauthorized
        }
      },
      post: {
        tags: ["Buildings"],
        summary: "Create a building (ADMIN)",
        requestBody: body("BuildingCreate"),
        responses: {
          201: response("Created building, Location header points to it", "Building"),
          400: error("Invalid body"),
          401: unauthorized,
          403: adminOnly,
          409: error("Building name already exists (UNIQUE_VIOLATION)")
        }
      }
    },
    "/api/buildings/{id}": {
      get: {
        tags: ["Buildings"],
        summary: "Get a building",
        parameters: [idParam("Building")],
        responses: {
          200: response("Building", "Building"),
          400: invalidId,
          401: unauthorized,
          404: error("Building not found")
        }
      },
      patch: {
        tags: ["Buildings"],
        summary: "Update a building (ADMIN)",
        parameters: [idParam("Building")],
        requestBody: body("BuildingUpdate"),
        responses: {
          200: response("Updated building", "Building"),
          400: error("Invalid id or body (at least one field)"),
          401: unauthorized,
          403: adminOnly,
          404: error("Building not found"),
          409: error("Building name already exists (UNIQUE_VIOLATION)")
        }
      },
      delete: {
        tags: ["Buildings"],
        summary: "Delete a building without rooms (ADMIN)",
        parameters: [idParam("Building")],
        responses: {
          204: { description: "Deleted" },
          400: invalidId,
          401: unauthorized,
          403: adminOnly,
          404: error("Building not found"),
          409: error("Building still has rooms (FOREIGN_KEY_VIOLATION)")
        }
      }
    },
    "/api/buildings/{id}/rooms": {
      get: {
        tags: ["Buildings"],
        summary: "Rooms of a building",
        parameters: [idParam("Building")],
        responses: {
          200: { description: "Rooms", content: json({ type: "array", items: ref("Room") }) },
          400: invalidId,
          401: unauthorized,
          404: error("Building not found")
        }
      }
    },
    "/api/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "List rooms with their building",
        responses: {
          200: { description: "Rooms", content: json({ type: "array", items: ref("Room") }) },
          401: unauthorized
        }
      },
      post: {
        tags: ["Rooms"],
        summary: "Create a room (ADMIN)",
        requestBody: body("RoomCreate"),
        responses: {
          201: response("Created room", "Room"),
          400: error("Invalid body"),
          401: unauthorized,
          403: adminOnly,
          404: error("Building not found"),
          409: error("Room name already exists in this building (UNIQUE_VIOLATION)")
        }
      }
    },
    "/api/rooms/{id}": {
      get: {
        tags: ["Rooms"],
        summary: "Get a room",
        parameters: [idParam("Room")],
        responses: {
          200: response("Room", "Room"),
          400: invalidId,
          401: unauthorized,
          404: error("Room not found")
        }
      },
      patch: {
        tags: ["Rooms"],
        summary: "Rename a room or change its capacity (ADMIN)",
        parameters: [idParam("Room")],
        requestBody: body("RoomUpdate"),
        responses: {
          200: response("Updated room", "Room"),
          400: error("Invalid id or body (at least one field)"),
          401: unauthorized,
          403: adminOnly,
          404: error("Room not found"),
          409: error("Room name already exists in this building (UNIQUE_VIOLATION)")
        }
      },
      delete: {
        tags: ["Rooms"],
        summary: "Delete a room without reservations (ADMIN)",
        parameters: [idParam("Room")],
        responses: {
          204: { description: "Deleted" },
          400: invalidId,
          401: unauthorized,
          403: adminOnly,
          404: error("Room not found"),
          409: error("Room has reservations (FOREIGN_KEY_VIOLATION)")
        }
      }
    },
    "/api/reservations": {
      get: {
        tags: ["Reservations"],
        summary: "List reservations - USER gets only own, ADMIN gets all",
        parameters: [
          queryParam("userId", { type: "integer", minimum: 1 }, "ADMIN only - USER gets 403"),
          queryParam("roomId", { type: "integer", minimum: 1 }),
          queryParam("buildingId", { type: "integer", minimum: 1 }),
          queryParam("status", { type: "string", enum: ["CONFIRMED", "CANCELLED"] }),
          queryParam("from", timestamp, "Reservations overlapping [from, to)"),
          queryParam("to", timestamp, "Must be later than from"),
          queryParam("page", { type: "integer", minimum: 1, default: 1 }),
          queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
          queryParam("sort", {
            type: "string",
            enum: ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"],
            default: "startTime"
          })
        ],
        responses: {
          200: response("Page of reservations with meta", "ReservationPage"),
          400: error("Invalid query parameter, from >= to"),
          401: unauthorized,
          403: error("userId filter used by USER (FORBIDDEN)")
        }
      },
      post: {
        tags: ["Reservations"],
        summary: "Create a reservation for the logged in user",
        requestBody: body("ReservationCreate"),
        responses: {
          201: response("Created reservation", "Reservation"),
          400: error("Invalid body, userId/reservedBy in body, endTime <= startTime, duration outside 15 min - 8 h, start in the past"),
          401: unauthorized,
          404: error("Room not found"),
          409: error("Capacity exceeded (ROOM_CAPACITY_EXCEEDED) or overlapping reservation (ROOM_ALREADY_BOOKED)")
        }
      }
    },
    "/api/reservations/{id}": {
      get: {
        tags: ["Reservations"],
        summary: "Get a reservation (owner or ADMIN)",
        parameters: [idParam("Reservation")],
        responses: {
          200: response("Reservation", "Reservation"),
          400: invalidId,
          401: unauthorized,
          404: error("Reservation not found - also when it belongs to another USER")
        }
      }
    },
    "/api/reservations/{id}/cancel": {
      patch: {
        tags: ["Reservations"],
        summary: "Cancel a reservation (owner or ADMIN), idempotent",
        parameters: [idParam("Reservation")],
        responses: {
          200: response("Cancelled reservation", "Reservation"),
          400: invalidId,
          401: unauthorized,
          404: error("Reservation not found - also when it belongs to another USER"),
          409: error("Reservation has already started (RESERVATION_ALREADY_STARTED)")
        }
      }
    },
    "/api/admin/audit-log": {
      get: {
        tags: ["Audit log"],
        summary: "Reservation events, newest first (ADMIN)",
        parameters: [
          queryParam("eventType", { type: "string", enum: ["reservation.created", "reservation.cancelled"] }),
          queryParam("page", { type: "integer", minimum: 1, default: 1 }),
          queryParam("limit", { type: "integer", minimum: 1, maximum: 100, default: 20 })
        ],
        responses: {
          200: response("Page of audit log entries with meta", "AuditLogPage"),
          400: error("Invalid query parameter"),
          401: unauthorized,
          403: adminOnly
        }
      }
    }
  }
};
