/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `PendingUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PendingUser_phone_key" ON "PendingUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
