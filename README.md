# IITKart

Backend documentation at `backend/README.md`

## Frontend

```bash
# Commands to start development server
npm install
npm run dev
```

# Planned Structure


## Project Structure Diagram

```mermaid
graph TD
    A[IITKart Root]
    A --> B[Frontend - React + Vite]
    A --> C[Backend - Node + Express]
    A --> D[Database]
    A --> E[Config Files]

    B --> B1[Components]
    B --> B2[Pages]
    B --> B3[Context]
    B --> B4[Hooks]
    B --> B5[Services]

    C --> C1[Controllers]
    C --> C2[Routes]
    C --> C3[Services]
    C --> C4[Middlewares]
    C --> C5[Config]
    C --> C6[Utils]
    C --> C7[Prisma ORM]

    D --> D1[PostgreSQL]
    D --> D2[Migrations]
    D --> D3[Seed Data]
```

This diagram represents the high-level monorepo architecture of IITKart.

---

## 1. Root Directory

```
IITKart/
├── frontend/                 
├── backend/                  
├── database/                 
├── .gitignore                
├── README.md                 
└── package.json              
```

---

## 2. Backend Structure

```
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
├── .env
├── package.json
└── tsconfig.json
```

---

## 3. Frontend Structure

```
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── common/
│   │   └── features/
│   ├── context/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Database Overview

Core Prisma Models:

- User (Customer, Vendor, Rider, Admin)
- VendorProfile
- Product
- Order
- OrderItem
- RiderProfile
- Payment

---

## Notes

- Monorepo architecture for frontend and backend.
- Backend follows Controller–Service pattern.
- Frontend uses feature-based modular design.
- Prisma enables type-safe database access and migrations.
