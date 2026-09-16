import {
	Color,
	InstancedMesh,
	Matrix4,
	type BufferGeometry,
	type Material,
} from 'three';

/** A drawn instance. Its index changes when an earlier instance is removed. */
export interface Slot {
	index: number;
}

export interface Instances {
	readonly mesh: InstancedMesh;
	add(color: number): Slot;
	remove(slot: Slot): void;
	setMatrix(slot: Slot, matrix: Matrix4): void;
	/** Uploads the matrices written this frame. */
	commit(): void;
}

/**
 * Every object of one shape in one draw call. Removal is O(1): the last
 * instance moves into the freed slot.
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
