"""
War Nexus — Complete Base Scene Generator
Tum binalari iceren tek bir sahne gorseli
"""
import sys
import json
import time
import urllib.request
import urllib.parse
import uuid
import os

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

COMFY_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "base", "terrain")
os.makedirs(OUTPUT_DIR, exist_ok=True)

MODEL = "DreamShaperXL_Turbo_SFWdpmppSde_half_pruned.safetensors"

SCENES = [
    {
        "filename": "base_scene_v1.png",
        "seed": 11111,
        "prompt": (
            "aerial isometric view of a complete military desert base, "
            "sandy orange desert terrain, all military buildings visible on one map, "
            "command center headquarters in center, barracks with tents left side, "
            "aircraft hangar with runway top right, naval shipyard with warship bottom, "
            "oil field with pump jacks, research lab with radar dishes right side, "
            "defense towers at corners, connecting dirt roads between buildings, "
            "military vehicles on roads, desert operations game style, "
            "photorealistic 3D render, aerial bird eye view, "
            "warm sunset lighting, dust haze, military green and sand colors, "
            "high detail, professional game concept art, "
            "Desert Operations browser game art style"
        ),
    },
    {
        "filename": "base_scene_v2.png",
        "seed": 22222,
        "prompt": (
            "top-down isometric military strategy game map, desert base, "
            "sandy terrain with military installations, "
            "large command bunker center, aircraft runway top, "
            "naval port with destroyer ship bottom, "
            "tank factory with armored vehicles, barracks military tents, "
            "oil refinery with tanks, mining facility, bank vault building, "
            "research laboratory, radar tower, guard towers, "
            "dirt paths connecting all buildings, military trucks on roads, "
            "aerial perspective, warm orange desert light, "
            "realistic render, strategy game map background, "
            "high quality detailed illustration"
        ),
    },
    {
        "filename": "base_scene_v3.png",
        "seed": 33333,
        "prompt": (
            "bird eye view military base in desert, isometric 3D render, "
            "complete military installation aerial view, "
            "headquarters bunker, soldier barracks, tank depot hangar, "
            "military airport with jet fighters, naval dock with warships, "
            "oil drilling facility, ore mine, treasury vault, "
            "science research center, anti-air defense towers, "
            "radar communication station, "
            "connected by military roads, desert sand terrain, "
            "realistic photorealistic game art, "
            "cinematic lighting, orange sand dunes background, "
            "Desert Operations game aesthetic"
        ),
    },
]


def build_workflow(prompt: str, seed: int) -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 3.5,
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": "dpm_adaptive",
                "scheduler": "karras",
                "seed": seed,
                "steps": 12,
            },
        },
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": MODEL}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"batch_size": 1, "height": 1024, "width": 768}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": prompt}},
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["4", 1],
                "text": "people, soldiers walking, text, watermark, blurry, low quality, cartoon, white background, flat 2D, sketch",
            },
        },
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "warnexus_scene", "images": ["8", 0]}},
    }


def queue_prompt(workflow: dict) -> str:
    payload = json.dumps({"prompt": workflow, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(f"{COMFY_URL}/prompt", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["prompt_id"]


def wait_for_completion(prompt_id: str) -> None:
    while True:
        with urllib.request.urlopen(f"{COMFY_URL}/history/{prompt_id}") as r:
            if prompt_id in json.loads(r.read()):
                return
        time.sleep(1)


def get_output_image(prompt_id: str) -> bytes | None:
    with urllib.request.urlopen(f"{COMFY_URL}/history/{prompt_id}") as r:
        history = json.loads(r.read())
    for node_output in history.get(prompt_id, {}).get("outputs", {}).values():
        for img in node_output.get("images", []):
            url = f"{COMFY_URL}/view?filename={urllib.parse.quote(img['filename'])}&subfolder={img['subfolder']}&type={img['type']}"
            with urllib.request.urlopen(url) as r:
                return r.read()
    return None


def main():
    print("=== War Nexus Scene Generator ===")
    for i, scene in enumerate(SCENES, 1):
        print(f"[{i}/3] {scene['filename']} (seed={scene['seed']})...")
        pid = queue_prompt(build_workflow(scene["prompt"], scene["seed"]))
        print(f"  Kuyrukta: {pid[:8]}...")
        wait_for_completion(pid)
        img = get_output_image(pid)
        if img:
            path = os.path.join(OUTPUT_DIR, scene["filename"])
            with open(path, "wb") as f:
                f.write(img)
            print(f"  Kaydedildi: {scene['filename']} ({len(img)//1024} KB)")
        else:
            print(f"  Hata!")

    print("\nTamamlandi! 3 sahne varyanti uretildi.")
    print("En begendignini 'base_scene.png' olarak kaydet.")


if __name__ == "__main__":
    main()
