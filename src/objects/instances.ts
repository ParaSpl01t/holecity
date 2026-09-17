import {
	BatchedMesh,
	BufferAttribute,
	Color,
	Vector4,
	type BufferGeometry,
	type Material,
	type Matrix4,
} from 'three';

/** A drawn instance: its id in the batch holding it. Ids never change. */
export interface Slot {
	readonly index: number;
}

export interface Batch {
	readonly mesh: BatchedMesh;
	/**
	 * Registers a shape (`batchable`). The same shapes registered in the same
	 * order get the same ids in every batch.
	 */
	addGeometry(geometry: BufferGeometry): number;
	add(geometryId: number, color: number, alpha: number): Slot;
	remove(slot: Slot): void;
	setMatrix(slot: Slot, matrix: Matrix4): void;
	getMatrix(slot: Slot, out: Matrix4): Matrix4;
	setColor(slot: Slot, color: number, alpha: number): void;
}

/** What a batch has room for: instances, and all its shapes' vertices and indices. */
export interface BatchSize {
	instances: number;
	vertices: number;
	indices: number;
}

/**
 * Objects of any shapes in one draw call (three's `BatchedMesh`, multi-draw),
 * each colored with its own alpha. Sized once. Removal frees the id for the
 * next instance; objects spread over the playzone and move, so the batch as a
 * whole is never culled, but each object is.
 */
export function createBatch(
	material: Material,
	size: BatchSize,
	sortObjects: boolean
): Batch {
	const mesh = new BatchedMesh(
		Math.max(size.instances, 1),
		Math.max(size.vertices, 1),
		Math.max(size.indices, 1),
		material
	);
	mesh.frustumCulled = false;
	mesh.sortObjects = sortObjects;
	const color = new Color();
	const rgba = new Vector4();
	const setColor = (index: number, hex: number, alpha: number) => {
		color.set(hex);
		mesh.setColorAt(index, rgba.set(color.r, color.g, color.b, alpha));
	};

	return {
		mesh,
		addGeometry: (geometry) => mesh.addGeometry(geometry),
		add(geometryId, hex, alpha) {
			const index = mesh.addInstance(geometryId);
			setColor(index, hex, alpha);
			return { index };
		},
		remove(slot) {
			mesh.deleteInstance(slot.index);
		},
		setMatrix(slot, matrix) {
			// Flags its own upload.
			mesh.setMatrixAt(slot.index, matrix);
		},
		getMatrix: (slot, out) => mesh.getMatrixAt(slot.index, out),
		setColor: (slot, hex, alpha) => setColor(slot.index, hex, alpha),
	};
}

/**
 * Brings a geometry to the one format every shape in a batch shares: indexed,
 * with position, normal and color (white where it has none), no uv.
 */
export function batchable(geometry: BufferGeometry): BufferGeometry {
	const count = geometry.getAttribute('position').count;
	geometry.deleteAttribute('uv');
	if (!geometry.getAttribute('color')) {
		geometry.setAttribute(
			'color',
			new BufferAttribute(new Float32Array(count * 3).fill(1), 3)
		);
	}
	if (!geometry.getIndex()) {
		geometry.setIndex(Array.from({ length: count }, (_, i) => i));
	}
	return geometry;
}

/** Vertex and index counts of a batchable geometry. */
export function sizeOf(geometry: BufferGeometry): {
	vertices: number;
	indices: number;
} {
	return {
		vertices: geometry.getAttribute('position').count,
		indices: geometry.getIndex()!.count,
	};
}
