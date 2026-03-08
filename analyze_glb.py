import struct
import json
import sys

def parse_glb(file_path):
    try:
        with open(file_path, 'rb') as f:
            # Read Header
            magic = f.read(4)
            if magic != b'glTF':
                print("Not a valid GLB file.")
                return

            version = struct.unpack('<I', f.read(4))[0]
            length = struct.unpack('<I', f.read(4))[0]

            # Read Chunk 0 (JSON)
            chunk_length = struct.unpack('<I', f.read(4))[0]
            chunk_type = f.read(4)

            if chunk_type != b'JSON':
                print("First chunk is not JSON.")
                return

            json_data = f.read(chunk_length)
            gltf = json.loads(json_data.decode('utf-8'))

            print("--- Nodes / Meshes found in GLB ---")
            
            if 'nodes' in gltf:
                for i, node in enumerate(gltf['nodes']):
                    name = node.get('name', f"Node_{i}")
                    print(f"Node: {name}")
            
            if 'meshes' in gltf:
                for i, mesh in enumerate(gltf['meshes']):
                    name = mesh.get('name', f"Mesh_{i}")
                    print(f"Mesh: {name}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    parse_glb("volvo_s90_recharge_free.glb")
