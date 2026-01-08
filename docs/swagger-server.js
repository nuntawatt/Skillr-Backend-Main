const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
// Embedded OpenAPI spec (inlined so a single file serves the docs)
const SPEC_YAML = `openapi: 3.0.3
info:
  title: Skillr — Media & Course API (Full)
  version: "1.0.0"
  description: | 
    เอกสาร OpenAPI แบบครบถ้วนสำหรับฟีเจอร์หลัก:
    - อัปโหลดรูปภาพและวิดีโอ (multipart)
    - ขอ presign / สตรีมไฟล์ (image/video)
    - สร้างและดู Course
    - สร้างและดู Lesson

servers:
  - url: http://10.3.1.88:3004/api
    description: Media service (LAN)
  - url: http://localhost:3004/api
    description: Media service (local host)
  - url: http://10.3.1.88:3002/api
    description: Course service (LAN)
  - url: http://localhost:3002/api
    description: Course service (local host)

tags:
  - name: Media
    description: อัปโหลด / presign / สตรีม ไฟล์
  - name: Course
    description: สร้างและดูคอร์ส
  - name: Lesson
    description: สร้างและดูบทเรียน

paths:
  /media/assets/images/upload:
    post:
      tags: [Media]
      summary: อัปโหลดรูปภาพ
      description: |
        อัปโหลดไฟล์รูปภาพเป็น multipart/form-data (field: 'file').
        รองรับการส่ง 'owner_user_id' เป็นตัวเลือกเพื่อระบุเจ้าของไฟล์.
      operationId: uploadImage
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: ไฟล์รูปภาพ
                owner_user_id:
                  type: integer
                  description: รหัสเจ้าของ (optional)
              required:
                - file
      responses:
        "201":
          description: อัปโหลดสำเร็จ — คืน 'media_asset_id', 'key', 'public_url'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResponse'
        "400":
          description: ข้อมูลไม่ถูกต้อง

  /media/videos/upload:
    post:
      tags: [Media]
      summary: อัปโหลดวิดีโอ
      description: |
        อัปโหลดไฟล์วิดีโอเป็น multipart/form-data (field: 'file').
        รองรับการส่ง 'media_asset_id' สำหรับการอัปเดต asset ที่มีอยู่ (resumable flow) และ 'owner_user_id' (optional).
      operationId: uploadVideo
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: ไฟล์วิดีโอ
                media_asset_id:
                  type: integer
                  description: รหัส asset ที่ต้องการอัปเดต (optional)
                owner_user_id:
                  type: integer
                  description: รหัสเจ้าของ (optional)
              required:
                - file
      responses:
        "201":
          description: อัปโหลดสำเร็จ — คืน 'media_asset_id', 'key', 'public_url'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResponse'
        "400":
          description: ข้อมูลไม่ถูกต้อง
        "413":
          description: ขนาดไฟล์เกินขีดจำกัด

  /media/assets/images/presign/{key}:
    get:
      tags: [Media]
      summary: ขอ URL สำหรับดู/ดาวน์โหลดรูป (presign/stream)
      description: สตรีม/รีไดเรกไปยังไฟล์รูป โดยใช้ 'key' ที่ได้จากการอัปโหลด (ไม่รวม prefix 'images/'/bucket)
      operationId: presignImage
      parameters:
        - name: key
          in: path
          required: true
          schema:
            type: string
          description: คีย์ไฟล์รูป เช่น 'abc123.jpg' หรือ 'uuid'
      responses:
        "200":
          description: คืน URL presigned หรือ stream
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PresignResponse'
        "404":
          description: ไม่พบไฟล์

  /media/videos/presign/{key}:
    get:
      tags: [Media]
      summary: ขอ URL สำหรับดู/ดาวน์โหลดวิดีโอ (presign/stream)
      description: สตรีม/รีไดเรกไปยังไฟล์วิดีโอ โดยใช้ 'key' ที่ได้จากการอัปโหลด (ไม่รวม prefix 'videos/'/bucket)
      operationId: presignVideo
      parameters:
        - name: key
          in: path
          required: true
          schema:
            type: string
          description: คีย์วิดีโอ เช่น '9cb49342-...'
      responses:
        "200":
          description: คืน URL presigned หรือ stream
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PresignResponse'
        "404":
          description: ไม่พบไฟล์

  /courses:
    post:
      tags: [Course]
      summary: สร้าง Course
      description: สร้างคอร์สใหม่ โดยส่งข้อมูลเบื้องต้นและสามารถใส่ 'coverMediaId' / 'introMediaId' (media_asset id) ได้
      operationId: createCourse
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateCourseRequest'
      responses:
        "201":
          description: สร้างสำเร็จ — คืนข้อมูลคอร์ส
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CourseResponse'
        "400":
          description: ข้อมูลไม่ถูกต้อง

  /courses/{id}:
    get:
      tags: [Course]
      summary: ดู Course ตาม id
      operationId: getCourse
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
          description: รหัสคอร์ส
      responses:
        "200":
          description: คืนข้อมูลคอร์ส
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CourseResponse'
        "404":
          description: ไม่พบคอร์ส

  /lessons:
    post:
      tags: [Lesson]
      summary: สร้าง Lesson (สามารถสร้างก่อนผูกกับคอร์สได้)
      operationId: createLesson
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateLessonRequest'
      responses:
        "201":
          description: สร้างบทเรียนสำเร็จ
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LessonResponse'
        "400":
          description: ข้อมูลไม่ถูกต้อง

  /lessons/{id}:
    get:
      tags: [Lesson]
      summary: ดู Lesson ตาม id
      operationId: getLesson
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
          description: รหัสบทเรียน
      responses:
        "200":
          description: คืนข้อมูลบทเรียน (รวม resources)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LessonResponse'
        "404":
          description: ไม่พบบทเรียน

components:
  schemas:
    UploadResponse:
      type: object
      properties:
        media_asset_id:
          type: integer
          example: 12
        key:
          type: string
          description: คีย์สั้นที่ใช้ในการ presign/stream (ไม่รวม prefix)
          example: 9cb49342-056a-4deb-9f10-1fc522f6717b
        public_url:
          type: string
          example: http://10.3.1.88:9000/media/videos/9cb49342-056a-4deb-9f10-1fc522f6717b

    PresignResponse:
      type: object
      properties:
        url:
          type: string
          example: https://minio.example.com/media/videos/9cb4...?X-Amz-Signature=...

    CreateCourseRequest:
      type: object
      properties:
        coverMediaId:
          type: integer
          description: media_asset id ของรูปปก
        title:
          type: string
        introMediaId:
          type: integer
          description: media_asset id ของวิดีโอแนะนำ
        description:
          type: string
        level:
          type: string
          example: beginner
        price:
          type: number
        tags:
          type: array
          items:
            type: string
      required:
        - title
      example:
        coverMediaId: 12
        title: "Big Data Basic"
        introMediaId: 34
        description: "เริ่มต้น Course ....."
        level: "beginner"
        price: 500
        tags: ["data","bigdata","intro"]

    CourseResponse:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        description:
          type: string
        level:
          type: string
        price:
          type: number
        tags:
          type: array
          items:
            type: string
        coverMediaAssetId:
          type: integer
        introMediaAssetId:
          type: integer
      example:
        id: 101
        title: "Big Data Basic"
        description: "เริ่มต้น Course ....."
        level: "beginner"
        price: 500
        tags: ["data","bigdata","intro"]
        coverMediaAssetId: 12
        introMediaAssetId: 34

    CreateLessonRequest:
      type: object
      properties:
        title:
          type: string
        content_text:
          type: string
        position:
          type: integer
        courseId:
          type: integer
      required:
        - title
      example:
        title: "Lesson 1 - Upload Test"
        content_text: "Optional description"

    LessonResponse:
      type: object
      properties:
        id:
          type: integer
        title:
          type: string
        content_text:
          type: string
        position:
          type: integer
        courseId:
          type: integer
        resources:
          type: array
          items:
            $ref: '#/components/schemas/LessonResource'
      example:
        id: 201
        title: "Lesson 1 - Upload Test"
        content_text: "Optional description"
        position: 0
        courseId: null
        resources: []

    LessonResource:
      type: object
      properties:
        id:
          type: integer
        type:
          type: string
          description: video|file|link|quiz|assignment
        media_asset_id:
          type: integer
        url:
          type: string

  examples:
    UploadImageCurl:
      summary: ตัวอย่าง curl อัปโหลดรูป
      value: |
        curl -X POST "http://localhost:3004/api/media/assets/images/upload" \
          -H "Content-Type: multipart/form-data" \
          -F "file=@/path/to/image.jpg" \
          -F "owner_user_id=0"
    UploadVideoCurl:
      summary: ตัวอย่าง curl อัปโหลดวิดีโอ
      value: |
        curl -X POST "http://localhost:3004/api/media/videos/upload" \
          -H "Content-Type: multipart/form-data" \
          -F "file=@/path/to/video.mp4" \
          -F "media_asset_id=0"

security: []

x-instructions: |
  วิธีใช้งานเอกสารนี้ (สั้น)
  1) นำไฟล์นี้ไปรันด้วย Redoc หรือ Swagger UI (วิธีตัวอย่างด้านล่าง)
  2) สำหรับ upload ให้ใช้ multipart/form-data (key: 'file')
  3) หลังอัปโหลดสำเร็จ จะได้ 'media_asset_id' และ 'key' — ใช้ 'key' กับ endpoint presign (/media/videos/presign/{key}) หรือใช้ 'media_asset_id' กับ endpoint status/playback


# How to serve locally
# Option A — Redoc CLI
#   npx redoc-cli serve d:/Woxa_Skillr/Backend-Skillr/skillr/openapi-media-course-full.yaml
#   then open http://localhost:8080

# Option B — Swagger UI Docker
#   docker run --rm -p 8080:8080 -e SWAGGER_JSON=/spec/openapi-media-course-full.yaml -v "\${PWD}/skillr:/spec" swaggerapi/swagger-ui
#   open http://localhost:8080 and select /spec/openapi-media-course-full.yaml
`;

const html = (specUrl) => `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Skillr API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css" />
  <style>html,body{height:100%;margin:0;padding:0}#swagger-ui{height:100vh}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html('/openapi.yaml'));
    return;
  }

  if (req.method === 'GET' && req.url === '/openapi.yaml') {
    res.writeHead(200, { 'Content-Type': 'application/x-yaml; charset=utf-8' });
    res.end(SPEC_YAML);
    return;
  }

  // fallback
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Swagger UI server running: http://localhost:${PORT}`);
  console.log('Serving inline OpenAPI spec at /openapi.yaml');
});
