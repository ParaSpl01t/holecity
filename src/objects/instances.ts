import {
	BatchedMesh,
	Color,
	InstancedMesh,
	Matrix4,
	type BufferGeometry,
	type Material,
} from 'three';

/** A drawn instance. Its index may change when another instance is removed. */
export interface Slot {
	index: number;
}

/** Many objects drawn in one draw call, each placed through its slot. */
export interface Drawer {
	remove(slot: Slot): void;
	setMatrix(slot: Slot, matrix: Matrix4): void;
	/** Uploads the matrices written this frame. */
	commit(): void;
}

/** Objects sharing one geometry. */
export interface Instances extends Drawer {
	readonly mesh: InstancedMesh;
	add(color: number): Slot;
}

/** Objects with a geometry each. */
export interface Batch extends Drawer {
	readonly mesh: BatchedMesh;
	add(geometry: BufferGeometry, color: number): Slot;
}

/**
 * Every object of one shape in one draw call. Removal is O(1): the last
 * instance moves into the freed slot, whose index it takes.
 */
export function createInstances(
	geometry: BufferGeometry,
	material: Material,
	capacity: number
): Instances {
	const mesh = new InstancedMesh(geometry, material, Math.max(capacity, 1));
	mesh.count = 0;
	// Instances spread over the whole playzone and move, so one bounding volume
	// for the mesh would never cull anything.
	mesh.frustumCulled = false;
	const slots: Slot[] = [];
	const color = new Color();
	const matrix = new Matrix4();

	const colorsChanged = () => {
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	};

	return {
		mesh,
		add(hex) {
			const slot = { index: slots.length };
			slots.push(slot);
			mesh.setColorAt(slot.index, color.set(hex));
			mesh.count = slots.length;
			colorsChanged();
			return slot;
		},
		remove(slot) {
			const last = slots.pop();
			if (last && last !== slot) {
				mesh.getColorAt(last.index, color);
				mesh.setColorAt(slot.index, color);
				mesh.getMatrixAt(last.index, matrix);
				mesh.setMatrixAt(slot.index, matrix);
				last.index = slot.index;
				slots[slot.index] = last;
			}
			mesh.count = slots.length;
			colorsChanged();
		},
		setMatrix(slot, value) {
			mesh.setMatrixAt(slot.index, value);
		},
		commit() {
			mesh.instanceMatrix.needsUpdate = true;
		},
	};
}

/**
 * Objects that each have their own geometry, still in one draw call (three's
 * `BatchedMesh`, multi-draw). Sized once: `vertices` is the total of every
 * geometry that will be added. Slots never change index. Removal scans the
 * batch's instances, fine at tens of objects.
 */
export function createBatch(
	material: Material,
	capacity: number,
	vertices: number
): Batch {
	const mesh = new BatchedMesh(
		Math.max(capacity, 1),
		Math.max(vertices, 1),
		undefined,
		material
	);
	// As with instances, one bounding volume for moving objects spread over
	// the playzone culls nothing; each object is still culled on its own.
	mesh.frustumCulled = false;
	// Opaque: the depth test already resolves overlap, sorting buys nothing.
	mesh.sortObjects = false;
	const color = new Color();

	return {
		mesh,
		add(geometry, hex) {
			const index = mesh.addInstance(mesh.addGeometry(geometry));
			mesh.setColorAt(index, color.set(hex));
			return { index };
		},
		remove(slot) {
			// Deleting the geometry deletes its one instance too.
			mesh.deleteGeometry(mesh.getGeometryIdAt(slot.index));
		},
		setMatrix(slot, value) {
			mesh.setMatrixAt(slot.index, value);
		},
		// `setMatrixAt` flags its own upload.
		commit() {},
	};
}
