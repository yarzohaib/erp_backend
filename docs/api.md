# SigSignature API Specification

This document details the public and authenticated endpoints for the SigSignature API, focusing on the Signature Management and Direct Asset Upload endpoints.

---

## 1. Unified Response Envelope

All API endpoints strictly follow the unified response envelope format.

### Success Response Envelope
```json
{
  "success": true,
  "message": "Optional human-readable success description",
  "data": { ... }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Human-readable error summary",
  "errors": [
    {
      "code": "custom",
      "path": ["field", "nestedField"],
      "message": "Specific validation failure message"
    }
  ]
}
```

---

## 2. POST /api/v1/signatures

Creates a new email signature for the authenticated user.

- **Authentication**: Required (`Bearer <token>` in `Authorization` header or `session` cookie).
- **Rate Limit**: Standard authenticated user rate limits apply.
- **Payload Max Size**: Combined `data` object must not exceed 64 KB.

### Minimal Example Request
```http
POST /api/v1/signatures HTTP/1.1
Host: api.sigsignature.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "name": "My Minimal Signature",
  "templateId": "corporate"
}
```

### Minimal Example Response (`201 Created`)
```json
{
  "success": true,
  "message": "Signature created successfully",
  "data": {
    "id": "c1f7a0b2-3e4d-4e5f-9a1b-2c3d4e5f6a7b",
    "name": "My Minimal Signature",
    "templateId": "corporate",
    "templateVersion": 1,
    "data": {
      "fullName": "",
      "jobTitle": "",
      "companyName": "",
      "email": "",
      "phone": "",
      "website": "",
      "avatarUrl": "",
      "companyLogoUrl": "",
      "themeColor": "#2563eb",
      "fontFamily": "Arial",
      "layout": "two-column",
      "socialIconsStyle": "filled",
      "socials": {
        "linkedin": "",
        "twitter": "",
        "facebook": "",
        "instagram": ""
      },
      "optional": {
        "address": "",
        "tagline": "",
        "disclaimer": ""
      }
    },
    "createdAt": "2026-10-21T12:00:00.000Z",
    "updatedAt": "2026-10-21T12:00:00.000Z"
  }
}
```

---

### Full Example Request
```http
POST /api/v1/signatures HTTP/1.1
Host: api.sigsignature.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "name": "Sarah Connor - Executive Signature",
  "templateId": "corporate",
  "templateVersion": 1,
  "data": {
    "fullName": "Sarah Connor",
    "jobTitle": "Chief Technology Officer",
    "companyName": "Cyberdyne Systems",
    "email": "sarah@cyberdyne.com",
    "phone": "+1 (555) 019-2834",
    "website": "https://cyberdyne.com",
    "avatarUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-1/avatar/profile.png",
    "companyLogoUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-1/logo/logo.png",
    "themeColor": "#2563eb",
    "fontFamily": "Inter",
    "layout": "two-column",
    "socialIconsStyle": "filled",
    "design": {
      "theme": "corporate",
      "shape": "rounded",
      "buttonStyle": "solid"
    },
    "socials": {
      "linkedin": "https://linkedin.com/in/sarahconnor",
      "twitter": "https://twitter.com/sarahconnor",
      "facebook": "",
      "instagram": "https://instagram.com/sarahconnor"
    },
    "optional": {
      "address": "100 Tech Blvd, Suite 400, Austin, TX",
      "tagline": "Pioneering Intelligent Solutions",
      "disclaimer": "This transmission contains confidential information intended solely for the recipient."
    },
    "extras": [
      {
        "type": "cta",
        "id": "book-meeting-1",
        "label": "Schedule Consultation",
        "url": "https://calendar.cyberdyne.com/sarah",
        "align": "left",
        "width": 200
      }
    ]
  }
}
```

### Full Example Response (`201 Created`)
```json
{
  "success": true,
  "message": "Signature created successfully",
  "data": {
    "id": "7b8e9f01-2a3b-4c5d-6e7f-8a9b0c1d2e3f",
    "name": "Sarah Connor - Executive Signature",
    "templateId": "corporate",
    "templateVersion": 1,
    "data": {
      "fullName": "Sarah Connor",
      "jobTitle": "Chief Technology Officer",
      "companyName": "Cyberdyne Systems",
      "email": "sarah@cyberdyne.com",
      "phone": "+1 (555) 019-2834",
      "website": "https://cyberdyne.com",
      "avatarUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-1/avatar/profile.png",
      "companyLogoUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-1/logo/logo.png",
      "themeColor": "#2563eb",
      "fontFamily": "Inter",
      "layout": "two-column",
      "socialIconsStyle": "filled",
      "design": {
        "theme": "corporate",
        "shape": "rounded",
        "buttonStyle": "solid"
      },
      "socials": {
        "linkedin": "https://linkedin.com/in/sarahconnor",
        "twitter": "https://twitter.com/sarahconnor",
        "facebook": "",
        "instagram": "https://instagram.com/sarahconnor"
      },
      "optional": {
        "address": "100 Tech Blvd, Suite 400, Austin, TX",
        "tagline": "Pioneering Intelligent Solutions",
        "disclaimer": "This transmission contains confidential information intended solely for the recipient."
      },
      "extras": [
        {
          "type": "cta",
          "id": "book-meeting-1",
          "label": "Schedule Consultation",
          "url": "https://calendar.cyberdyne.com/sarah",
          "align": "left",
          "width": 200
        }
      ]
    },
    "createdAt": "2026-10-21T12:05:00.000Z",
    "updatedAt": "2026-10-21T12:05:00.000Z"
  }
}
```

---

### Field Specification for `POST /api/v1/signatures`

#### Root Fields
| Field | Type | Required | Limits | Default | Allowed Values / Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `name` | String | **Yes** | 1 – 100 chars | None | Clean plain text. `<` and `>` markup rejected. |
| `templateId` | String | **Yes** | 1 – 64 chars | None | Lowercase letters, numbers, and hyphens (`^[a-z0-9-]+$`). |
| `templateVersion`| Integer | No | 1 – 1000 | `1` | Positive integer. |
| `data` | Object | No | Max 64 KB | `{}` | Signature content and styling payload (see below). |

#### `data` Fields
| Field | Type | Limits | Default | Allowed Values / Description |
| :--- | :--- | :--- | :--- | :--- |
| `fullName` | String | Max 100 chars | `""` | Clean plain text. |
| `jobTitle` | String | Max 100 chars | `""` | Clean plain text. |
| `companyName` | String | Max 100 chars | `""` | Clean plain text. |
| `email` | String | Max 254 chars | `""` | Clean plain text or valid email. |
| `phone` | String | Max 40 chars | `""` | Clean plain text. |
| `website` | String | Max 200 chars | `""` | Clean plain text URL. |
| `avatarUrl` | String | Max 2000 chars | `""` | Empty string, relative path starting with `/`, or HTTPS S3 authorized storage URL. |
| `companyLogoUrl`| String | Max 2000 chars | `""` | Empty string, relative path starting with `/`, or HTTPS S3 authorized storage URL. |
| `themeColor` | String | 7 chars (`#RRGGBB`) | `"#2563eb"` | Must match `^#[0-9a-fA-F]{6}$`. CSS injections rejected. |
| `fontFamily` | String | Enum | `"Arial"` | `Arial`, `Georgia`, `Verdana`, `Trebuchet MS`, `Tahoma`, `Inter`, `Roboto`, `DM Sans`, `Montserrat`, `Commissioner`. |
| `layout` | String | Enum | `"two-column"` | `two-column`, `horizontal`, `compact`, `single`, `corporate-card`. |
| `socialIconsStyle`| String | Enum | `"filled"` | `filled`, `outline`, `circle`, `minimal`. |
| `design` | Object | Optional | None | Sub-object with `theme` (`corporate`, `minimal`, `modern`, `dark`), `shape` (`rounded`, `square`, `pill`), and `buttonStyle` (`solid`, `outline`). |
| `socials` | Object | Optional | `{}` | Sub-object containing `linkedin`, `twitter`, `facebook`, `instagram` URLs (HTTP/HTTPS, max 300 chars). |
| `optional` | Object | Optional | `{}` | Sub-object with `address` (max 250), `tagline` (max 150), `disclaimer` (max 1000). |
| `extras` | Array | Max 20 items | `[]` | Discriminated union of extra items (`text`, `image`, `divider`, `cta`, `banner`). |

---

### Example Error Responses for `POST /api/v1/signatures`

#### 1. Invalid Theme Color (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Theme color must be a valid hex color code matching #RRGGBB",
  "errors": [
    {
      "code": "invalid_format",
      "path": ["data", "themeColor"],
      "message": "Theme color must be a valid hex color code matching #RRGGBB"
    }
  ]
}
```

#### 2. Unknown Layout (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid layout \"three-column\". Allowed values: two-column, horizontal, compact, single, corporate-card",
  "errors": [
    {
      "code": "custom",
      "path": ["data", "layout"],
      "message": "Invalid layout \"three-column\". Allowed values: two-column, horizontal, compact, single, corporate-card"
    }
  ]
}
```

#### 3. Unknown Font Family (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid fontFamily \"Papyrus\". Allowed values: Arial, Georgia, Verdana, Trebuchet MS, Tahoma, Inter, Roboto, DM Sans, Montserrat, Commissioner",
  "errors": [
    {
      "code": "custom",
      "path": ["data", "fontFamily"],
      "message": "Invalid fontFamily \"Papyrus\". Allowed values: Arial, Georgia, Verdana, Trebuchet MS, Tahoma, Inter, Roboto, DM Sans, Montserrat, Commissioner"
    }
  ]
}
```

#### 4. HTML/Markup Injection (`400 Bad Request`)
```json
{
  "success": false,
  "message": "This field cannot contain HTML or markup",
  "errors": [
    {
      "code": "custom",
      "path": ["data", "fullName"],
      "message": "This field cannot contain HTML or markup"
    }
  ]
}
```

---

## 3. PATCH /api/v1/signatures/:id

Updates an existing signature. Only fields present in the request are updated.

> [!NOTE]
> Unlike `POST /api/v1/signatures`, partial updates on `PATCH` do **not** inject default values for omitted fields. If `themeColor` or `layout` is omitted, the signature's existing values remain untouched.

### Example Request (`PATCH /api/v1/signatures/7b8e9f...`)
```http
PATCH /api/v1/signatures/7b8e9f01-2a3b-4c5d-6e7f-8a9b0c1d2e3f HTTP/1.1
Host: api.sigsignature.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "data": {
    "jobTitle": "VP of Product Engineering"
  }
}
```

### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Signature updated successfully",
  "data": {
    "id": "7b8e9f01-2a3b-4c5d-6e7f-8a9b0c1d2e3f",
    "name": "Sarah Connor - Executive Signature",
    "templateId": "corporate",
    "templateVersion": 1,
    "data": {
      "fullName": "Sarah Connor",
      "jobTitle": "VP of Product Engineering",
      "companyName": "Cyberdyne Systems",
      "themeColor": "#2563eb",
      "fontFamily": "Inter",
      "layout": "two-column",
      "socialIconsStyle": "filled"
    },
    "createdAt": "2026-10-21T12:05:00.000Z",
    "updatedAt": "2026-10-21T12:15:00.000Z"
  }
}
```

---

## 4. POST /api/v1/uploads/presign

Generates a presigned S3 PUT URL for direct client-to-S3 asset uploads (e.g., profile avatars, company logos).

- **Authentication**: Required (`Bearer <token>` or session cookie).
- **Rate Limit**: 30 requests per hour per user.

### Minimal Example Request
When `kind` is omitted, it automatically defaults to `"avatar"`.
```http
POST /api/v1/uploads/presign HTTP/1.1
Host: api.sigsignature.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "contentType": "image/png",
  "size": 1048576
}
```

### Minimal Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Presigned upload URL generated successfully",
  "data": {
    "uploadUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-123/avatar/d290f1ee-6c54-4b01-90e6-d701748f0851.png?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
    "key": "uploads/user-123/avatar/d290f1ee-6c54-4b01-90e6-d701748f0851.png",
    "publicUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-123/avatar/d290f1ee-6c54-4b01-90e6-d701748f0851.png"
  }
}
```

---

### Full Example Request
```http
POST /api/v1/uploads/presign HTTP/1.1
Host: api.sigsignature.com
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "kind": "logo",
  "contentType": "image/jpeg",
  "size": 524288
}
```

### Full Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Presigned upload URL generated successfully",
  "data": {
    "uploadUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-123/logo/e450b2a1-1c34-4a02-81e5-c602847e0912.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
    "key": "uploads/user-123/logo/e450b2a1-1c34-4a02-81e5-c602847e0912.jpg",
    "publicUrl": "https://sigsignature-prod-assets-2026.s3.ap-southeast-2.amazonaws.com/uploads/user-123/logo/e450b2a1-1c34-4a02-81e5-c602847e0912.jpg"
  }
}
```

---

### Field Specification for `POST /api/v1/uploads/presign`

| Field | Type | Required | Limits | Default | Allowed Values / Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `kind` | String | No | Enum | `"avatar"` | `avatar`, `logo`. |
| `contentType` | String | **Yes** | Enum | None | `image/jpeg`, `image/png`, `image/webp`. (SVGs and executables strictly rejected). |
| `size` | Integer | **Yes** | 1 to 2,097,152 bytes | None | Exact file size in bytes (max 2 MB / 2,097,152 bytes). |

---

### Example Error Responses for `POST /api/v1/uploads/presign`

#### 1. Invalid Kind (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid kind \"banner\". Allowed values: avatar, logo",
  "errors": [
    {
      "code": "custom",
      "path": ["kind"],
      "message": "Invalid kind \"banner\". Allowed values: avatar, logo"
    }
  ]
}
```

#### 2. Invalid Content-Type (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid contentType \"image/svg+xml\". Allowed values: image/jpeg, image/png, image/webp",
  "errors": [
    {
      "code": "custom",
      "path": ["contentType"],
      "message": "Invalid contentType \"image/svg+xml\". Allowed values: image/jpeg, image/png, image/webp"
    }
  ]
}
```

#### 3. File Size Exceeds Limit (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid size \"3000000\". File size must be between 1 and 2097152 bytes (2MB)",
  "errors": [
    {
      "code": "custom",
      "path": ["size"],
      "message": "Invalid size \"3000000\". File size must be between 1 and 2097152 bytes (2MB)"
    }
  ]
}
```

#### 4. Invalid Size Data Type (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid size \"large\". File size must be an integer",
  "errors": [
    {
      "code": "custom",
      "path": ["size"],
      "message": "Invalid size \"large\". File size must be an integer"
    }
  ]
}
```
