CREATE TABLE `ftir_bonds` (
	`id` text PRIMARY KEY NOT NULL,
	`bond` text NOT NULL,
	`range_from` real NOT NULL,
	`range_to` real NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `references` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`authors` text,
	`year` integer,
	`url` text,
	`note` text,
	`summary` text,
	`file_path` text,
	`text_path` text NOT NULL,
	`page_count` integer,
	`characters` integer NOT NULL,
	`is_truncated` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `references_project_idx` ON `references` (`project_id`);--> statement-breakpoint
CREATE TABLE `saved_plots` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`name` text NOT NULL,
	`settings` text NOT NULL,
	`filters` text NOT NULL,
	`unticked_ids` text NOT NULL,
	`style` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_plots_experiment_idx` ON `saved_plots` (`experiment_id`);--> statement-breakpoint
CREATE TABLE `analyses` (
	`id` text NOT NULL,
	`characterization_id` text NOT NULL,
	`kind` text NOT NULL,
	`settings` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`characterization_id`, `kind`),
	FOREIGN KEY (`characterization_id`) REFERENCES `characterizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characterizations` (
	`id` text PRIMARY KEY NOT NULL,
	`sample_id` text NOT NULL,
	`technique` text NOT NULL,
	`measured_on` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sample_id`) REFERENCES `samples`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `characterizations_sample_idx` ON `characterizations` (`sample_id`);--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`characterization_id` text NOT NULL,
	`file_name` text NOT NULL,
	`folder` text,
	`relative_path` text,
	`storage_path` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`characterization_id`) REFERENCES `characterizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `datasets_characterization_idx` ON `datasets` (`characterization_id`);--> statement-breakpoint
CREATE TABLE `derived_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text,
	`formula` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `derived_experiment_idx` ON `derived_columns` (`experiment_id`);--> statement-breakpoint
CREATE TABLE `experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`code_prefix` text NOT NULL,
	`protocol` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `experiments_project_idx` ON `experiments` (`project_id`);--> statement-breakpoint
CREATE TABLE `parameter_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text,
	`kind` text NOT NULL,
	`role` text NOT NULL,
	`default_value` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parameters_experiment_idx` ON `parameter_definitions` (`experiment_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`background` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sample_studies` (
	`sample_id` text NOT NULL,
	`study_id` text NOT NULL,
	`position` real NOT NULL,
	PRIMARY KEY(`sample_id`, `study_id`),
	FOREIGN KEY (`sample_id`) REFERENCES `samples`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`study_id`) REFERENCES `studies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `samples` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`code` text NOT NULL,
	`performed_on` text,
	`values` text NOT NULL,
	`implementation` text,
	`observation` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `samples_experiment_idx` ON `samples` (`experiment_id`);--> statement-breakpoint
CREATE TABLE `studies` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `studies_experiment_idx` ON `studies` (`experiment_id`);