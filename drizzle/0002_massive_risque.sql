CREATE TABLE `growAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text NOT NULL,
	`userName` varchar(100),
	`userEmail` varchar(320),
	`isActive` enum('active','inactive') NOT NULL DEFAULT 'active',
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `growAccounts` ADD CONSTRAINT `growAccounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;