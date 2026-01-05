CREATE TABLE "motd" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" varchar(500) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Seed some initial messages
INSERT INTO "motd" ("message") VALUES
	('Welcome aboard! Ready to ship something great?'),
	('Tip: Press Esc to go back'),
	('Happy shipping!'),
	('You''re doing great.'),
	('Ship it!');
