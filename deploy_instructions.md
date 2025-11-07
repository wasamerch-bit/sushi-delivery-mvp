Deploy / Run Instructions (lokal & gratis-hosting)
=====================================================

Lokal (schnelltest):
1. Installiere Docker & Docker Compose.
2. Aus dem Projekt-Root:
   docker-compose up --build
3. Mock-API ist erreichbar unter: http://localhost:3000
4. Test:
   bash tests/smoke_test.sh

Ohne Docker (Node lokal):
1. cd mock-server
2. npm install
3. npm start
4. API: http://localhost:3000

Empfehlung für kostenlose Hosting (kurz):
- Verwende Railway.app oder Render.com Free Tier (kostenloses Staging-Instance, begrenzt).
- Für statische Frontend: Vercel oder Netlify (kostenlos).
- Hinweis: Free-Tiers ändern sich; wähle den Anbieter, den du bevorzugst und folge deren Deploy-Guides.

CI:
- .github/workflows/ci.yml enthält einen einfachen Node CI skeleton. Aktiviere GitHub Actions im Repo.

DSGVO / Sicherheit:
- Setze JWT_SECRET in Umgebungsvariablen.
- Schütze Webhooks mit einem Secret.
- Verwende S3 / MinIO für Photos in Produktion.
