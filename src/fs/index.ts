import {
	type NoParamCallback,
	type PathLike,
	close,
	existsSync,
	lstatSync,
} from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { styleText } from "node:util";

/* TYPES */
export interface WriteFileOpts {
	filePath: string;
	data: string | NodeJS.ArrayBufferView;
}
export interface AppendFileOpts {
	/**
	 * path/to/file want to append
	 */
	filePath: PathLike;
	/**
	 * content to append
	 */
	content: string | Uint8Array;
}
export type E = "change" | "close" | "error";
export type L<T extends E> = T extends "change"
	? (eventType: string, filename: string | Buffer) => void
	: T extends "close"
		? () => void
		: T extends "error"
			? (error: Error) => void
			: undefined;
/* ----------------------------------------------------------------------------------------------- */
type AppendFileCallback = (
	err: NodeJS.ErrnoException | null,
	fd?: number,
) => void;

type AppendFileInnerCallback = (err: NodeJS.ErrnoException | null) => void;
/* ----------------------------------------------------------------------------------------------- */

// For sorting in natural order
const naturalOrder = new Intl.Collator(undefined, {
	numeric: true,
}).compare;
// Quick test: return true if object is a plain object, doesn't handle
// cross-realm objects.
function isPlainObject(object: unknown): object is Record<string, unknown> {
	return (
		object !== null &&
		typeof object === "object" &&
		Object.getPrototypeOf(object) === Object.prototype
	);
}

const _fs = {
	async exitFile(file: string) {
		return await fs
			.access(file, fs.constants.F_OK)
			.then(() => true)
			.catch(() => false);
	},
	/**
	 * Removes all files and subdirectories in the specified folder.
	 * @param folderPath The path to the folder to be cleared.
	 * @throws If the folder does not exist, no error is thrown.
	 * @throws If there is an error other than ENOENT, the error is re-thrown.
	 */
	async clear(folderPath: string) {
		const _folderPath = path.resolve(process.cwd(), folderPath);
		try {
			const entries = await fs.readdir(_folderPath, { withFileTypes: true });
			await Promise.all(
				entries.map((entry) =>
					fs.rm(path.join(_folderPath, entry.name), { recursive: true }),
				),
			);
		} catch (error) {
			if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code !== "ENOENT") {
				throw error;
			}
		}
	},
	/**
	 * Reads all files and subdirectories in the specified folder and returns
	 * their contents in a sorted object.
	 *
	 * @param folderPath - The path to the folder to be read.
	 * @returns A promise that resolves to an object containing directory entries,
	 *          where each key is the entry name and the value is the file buffer
	 *          or the result of reading a subfolder.
	 * @throws If the folder cannot be read, an error is thrown.
	 */

	async read(folderPath: string): Promise<Record<string, unknown>> {
		const _folderPath = path.resolve(process.cwd(), folderPath);

		// Collect the directory entries
		const directoryEntries = await fs.readdir(_folderPath, {
			withFileTypes: true,
		});

		// Map directory entries to file buffer or subfolder
		const entries = await Promise.all(
			directoryEntries.map(async (entry) => {
				const key = entry.name;
				const entryPath = path.join(_folderPath, entry.name);
				const value = entry.isFile()
					? await fs.readFile(entryPath)
					: await _fs.read(entryPath);
				return [key, value];
			}),
		);

		// Sort entries by name
		entries.sort(([keyA], [keyB]) => naturalOrder(String(keyA), String(keyB)));

		return Object.fromEntries(entries);
	},
	/**
	 * Writes files and subdirectories to the specified folder.
	 *
	 * @param folderPath - The path to the folder where the files and subfolders should be written.
	 * @param files - An object containing file and subfolder entries. Each key is the file or subfolder name,
	 *                and the value is either the file contents or a nested object for subfolders.
	 * @returns A promise that resolves when all files and subdirectories have been written.
	 * @throws If there is an error creating the folder or writing the files, an error is thrown.
	 */

	async write(folderPath: string, files: Record<string, any>) {
		const _folderPath = path.resolve(process.cwd(), folderPath);
		// Create the folder if it doesn't exist
		await fs.mkdir(_folderPath, { recursive: true });
		// Write out all the files
		await Promise.all(
			Object.entries(files).map(async ([fileName, contents]) => {
				const entryPath = path.join(_folderPath, fileName);
				return isPlainObject(contents)
					? _fs.write(entryPath, contents) // Subfolder
					: fs.writeFile(entryPath, contents); // File
			}),
		);
	},
	/**
	 * Closes the file descriptor.
	 *
	 * @param fd - The file descriptor to be closed.
	 * @throws An error is thrown if the close operation fails.
	 */

	close_fd(fd: number): void {
		close(fd, (err) => {
			if (err) throw err;
		});
	},
	/**
	 * Checks if the specified path is a file.
	 *
	 * @param f_path - The path to check.
	 * @returns True if the path is a file, false otherwise.
	 * @throws An error is thrown if the path does not exist or cannot be accessed.
	 */

	is_file(f_path: PathLike): boolean {
		return lstatSync(f_path).isFile();
	},
	/**
	 * Checks if the specified path is a directory.
	 *
	 * @param f_path - The path to check.
	 * @returns True if the path is a directory, false otherwise.
	 * @throws An error is thrown if the path does not exist or cannot be accessed.
	 */
	is_dir(f_path: PathLike): boolean {
		return lstatSync(f_path).isDirectory();
	},
	/**
	 * Returns the size of a file in bytes.
	 * @param f_path The path to the file.
	 * @returns The size of the file in bytes.
	 * @throws An error is thrown if the file does not exist or cannot be read.
	 */
	get_size(f_path: PathLike): number {
		return lstatSync(f_path).size;
	},
	/**
	 * Copies a file or a directory to a specified destination.
	 *
	 * @param src The source file or directory.
	 * @param des The destination file or directory.
	 * @param callback An optional callback that is called with an error if the operation fails.
	 */
	copy(
		src: string | URL,
		des: string | URL,
		callback?: (error: NodeJS.ErrnoException | null) => void,
	) {
		fs.cp(src, des)
			.then(() => {
				console.log(styleText(["italic", "green"], `Copied ${src} to ${des}`));
				if (callback) callback(null);
			})
			.catch((error) => {
				console.log(styleText("magenta", error.message));
				if (callback) callback(error);
			});
	},
	/**
	 * Creates a directory at the specified path.
	 *
	 * @param path The path to the directory to be created.
	 * @throws An error is thrown if the directory already exists or if the operation fails.
	 */
	async mk_dir(path: PathLike): Promise<void> {
		await fs.mkdir(path, { recursive: true });
	},
	/**
	 * Writes a file at the specified path with the given data.
	 *
	 * @param opts An object containing the file path and data.
	 * @param opts.filePath The path to the file to be written.
	 * @param opts.data The data to be written to the file.
	 * @throws An error is thrown if the file already exists or if the operation fails.
	 */
	async write_file({ filePath, data }: WriteFileOpts): Promise<void> {
		const directoryPath = path.dirname(filePath);
		if (!(await _fs.exitFile(directoryPath))) {
			_fs.mk_dir(directoryPath);
		}

		await fs.writeFile(filePath, data);
	},
	/**
	 * Adds content to a file at the specified path.
	 *
	 * @param path The path to the file to be added to.
	 * @param content The content to be added.
	 * @throws An error is thrown if the file does not exist or if the operation fails.
	 */
	async addToFile(path: string, content: string) {
		const exit = await _fs.exitFile(path);
		if (!exit) {
			console.log(`${path} not found`);
			return;
		}
		try {
			const fileHandler = await fs.open(path, "a");
			fileHandler.write(content);
			console.log(`Add content to ${path} successfully.`);
			fileHandler.close();
		} catch (error) {
			if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") {
				console.log("No file to add");
			} else {
				console.log(error);
			}
		}
	},
	/**
	 * Creates a new file at the specified path.
	 * @param path The path to the new file.
	 * @throws An error is thrown if the file already exists or if the operation fails.
	 */
	async createFile(path: string) {
		const exit = await _fs.exitFile(path);
		if (exit) {
			console.log(`The file ${path} already exit`);
			return;
		}
		const newFile = await fs.open(path, "w");
		console.log(`${path} was successfully created`);
		newFile.close();
	},
	/**
	 * Deletes a file at the specified path.
	 *
	 * @param path The path to the file to be deleted.
	 * @throws An error is thrown if the file does not exist or if the operation fails.
	 */
	async deleteFile(path: string) {
		const exit = await _fs.exitFile(path);
		if (!exit) {
			console.log(`${path} not found`);
			return;
		}
		try {
			await fs.unlink(path);
			console.log(`Delete ${path} successfully.`);
		} catch (error) {
			if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") {
				console.log("No file to remove");
			} else {
				console.log(error);
			}
		}
	},
	/**
	 * Rename a file.
	 *
	 * @param oldPath The old path of the file.
	 * @param newPath The new path of the file.
	 * @throws An error is thrown if the file does not exist or if the operation fails.
	 */
	async renameFile(oldPath: string, newPath: string) {
		const exit = await _fs.exitFile(oldPath);
		if (!exit) {
			console.log(`${oldPath} not found`);
			return;
		}
		try {
			await fs.rename(oldPath, newPath);
			console.log(`Rename ${oldPath} to ${newPath} successfully.`);
		} catch (error) {
			if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT") {
				console.log("No file to rename");
			} else {
				console.log(error);
			}
		}
	},
};

export default _fs;
