"""
War Nexus — Terrain Background Generator
"""
import sys
import json
import time
import urllib.request
import urllib.parse
import uuid
import os

sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # type: ignore

COMFY_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "base", "terrain")
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPT = (
    "top-down aerial view of a military desert base, "
    "sand and dirt ground texture, rocky terrain, "
    "dark desert sand color, military installation ground, "
    "overhead bird eye view, flat ground texture, "
    "worn dirt paths, cracked earth, desert camouflage pattern, "
    "no buildings, no people, seamless ground texture, "
    "dark military aesthetic, muted sand brown tones, "
    "strategy game map background, war game terrain, "
    "high detail aerial photograph style, 2D top-down"
)

NEG_PROMPT = (
    "buildings, people, soldiers, vehicles, text, watermark, "
    "bright colors, white, blue sky, trees, water, "
    "3D perspective, isometric, cartoon, anime, blurry"
)


def build_workflow(prompt: str, neg: str, seed: int, w: int, h: int) -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 7.0,
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "seed": seed,
                "steps": 35,
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"batch_size": 1, "height": h, "width": w},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["4", 1], "text": prompt},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["4", 1], "text": neg},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "warnexus_terrain", "images": ["8", 0]},
        },
    }


def queue_prompt(workflow: dict) -> str:
    payload = json.dumps({"prompt": workflow, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(
        f"{COMFY_URL}/prompt", data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["prompt_id"]


def wait_for_completion(prompt_id: str) -> None:
    while True:
        with urllib.request.urlopen(f"{COMFY_URL}/history/{prompt_id}") as r:
            history = json.loads(r.read())
        if prompt_id in history:
            return
        time.sleep(1)


def get_output_image(prompt_id: str) -> bytes | None:
    with urllib.request.urlopen(f"{COMFY_URL}/history/{prompt_id}") as r:
        history = json.loads(r.read())
    outputs = history.get(prompt_id, {}).get("outputs", {})
    for node_output in outputs.values():
        images = node_output.get("images", [])
        if images:
            img = images[0]
            url = (
                f"{COMFY_URL}/view"
                f"?filename={urllib.parse.quote(img['filename'])}"
                f"&subfolder={img['subfolder']}"
                f"&type={img['type']}"
            )
            with urllib.request.urlopen(url) as r:
                return r.read()
    return None


def main():
    print("=== War Nexus Terrain Generator ===")

    # 3 varyant uret, en iyi birini secebilirsin
    variants = [
        {"seed": 12345, "filename": "base_terrain_v1.png"},
        {"seed": 67890, "filename": "base_terrain_v2.png"},
        {"seed": 99999, "filename": "base_terrain_v3.png"},
    ]

    for v in variants:
        print(f"Uretiliyor: {v['filename']} (seed={v['seed']})...")
        workflow = build_workflow(PROMPT, NEG_PROMPT, v["seed"], 1024, 1024)
        pid = queue_prompt(workflow)
        print(f"  Kuyrukta: {pid[:8]}...")
        wait_for_completion(pid)
        img = get_output_image(pid)
        if img:
            path = os.path.join(OUTPUT_DIR, v["filename"])
            with open(path, "wb") as f:
                f.write(img)
            print(f"  Kaydedildi: {v['filename']} ({len(img)//1024} KB)")
        else:
            print(f"  Hata: gorsel alinamadi")

    print("\nTamamlandi! src/assets/base/terrain/ klasorunu kontrol et.")
    print("Begendignin gorseli 'base_scene.png' olarak yeniden adlandir.")


if __name__ == "__main__":
    main()
