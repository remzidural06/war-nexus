"""
War Nexus — Building Asset Generator
ComfyUI API ile 11 bina sprite'ı üretir.
Çalıştır: python scripts/generate_assets.py
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
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "base", "buildings")
os.makedirs(OUTPUT_DIR, exist_ok=True)

STYLE_PREFIX = (
    "top-down isometric view, military strategy game building sprite, "
    "dark desert military aesthetic, sand and metal colors, "
    "2.5D perspective, detailed pixel-art style, game asset, "
    "dark background, isolated building, high contrast, "
    "war game, desert operations style"
)

STYLE_SUFFIX = (
    "SDXL, sharp edges, clean sprite, no characters, no people, "
    "cinematic lighting, military green and sand tones"
)

NEG_PROMPT = (
    "people, soldiers, characters, text, watermark, blurry, "
    "low quality, cartoon, anime, bright colors, white background, "
    "modern civilian building, futuristic"
)

BUILDINGS = [
    {
        "id": "hq",
        "filename": "hq.png",
        "prompt": f"{STYLE_PREFIX}, military command center headquarters, large fortified bunker, "
                  f"concrete walls, antenna tower, sandbags, command post, {STYLE_SUFFIX}",
    },
    {
        "id": "barracks",
        "filename": "barracks.png",
        "prompt": f"{STYLE_PREFIX}, military barracks building, long rectangular army dormitory, "
                  f"camouflage netting, wooden bunks visible, training ground, {STYLE_SUFFIX}",
    },
    {
        "id": "tankFactory",
        "filename": "tankFactory.png",
        "prompt": f"{STYLE_PREFIX}, tank factory industrial building, large metal hangar, "
                  f"crane overhead, armored vehicle assembly, heavy machinery, {STYLE_SUFFIX}",
    },
    {
        "id": "airport",
        "filename": "airport.png",
        "prompt": f"{STYLE_PREFIX}, military airbase, runway, aircraft hangar, "
                  f"control tower, jet fighters on tarmac, desert airstrip, {STYLE_SUFFIX}",
    },
    {
        "id": "shipyard",
        "filename": "shipyard.png",
        "prompt": f"{STYLE_PREFIX}, naval shipyard, dry dock with warship, "
                  f"cranes, waterfront facility, military port, docked destroyer, {STYLE_SUFFIX}",
    },
    {
        "id": "oilField",
        "filename": "oilField.png",
        "prompt": f"{STYLE_PREFIX}, desert oil field, pump jacks, oil derricks, "
                  f"storage tanks, pipeline, crude oil facility, {STYLE_SUFFIX}",
    },
    {
        "id": "mine",
        "filename": "mine.png",
        "prompt": f"{STYLE_PREFIX}, open pit mine, excavation site, ore processing facility, "
                  f"mining equipment, conveyor belt, rock crusher, {STYLE_SUFFIX}",
    },
    {
        "id": "bank",
        "filename": "bank.png",
        "prompt": f"{STYLE_PREFIX}, military treasury vault, reinforced concrete bunker, "
                  f"heavy steel door, armored cash storage, fortified building, {STYLE_SUFFIX}",
    },
    {
        "id": "researchLab",
        "filename": "researchLab.png",
        "prompt": f"{STYLE_PREFIX}, military research laboratory, science facility, "
                  f"satellite dishes, server arrays, technical equipment, {STYLE_SUFFIX}",
    },
    {
        "id": "defenseTower",
        "filename": "defenseTower.png",
        "prompt": f"{STYLE_PREFIX}, military defense tower, guard tower with machine gun, "
                  f"watchtower, searchlight, fortified position, barbed wire, {STYLE_SUFFIX}",
    },
    {
        "id": "radar",
        "filename": "radar.png",
        "prompt": f"{STYLE_PREFIX}, military radar station, large rotating radar dish, "
                  f"signal tower, electronic warfare facility, antenna array, {STYLE_SUFFIX}",
    },
]


def build_workflow(prompt: str, neg_prompt: str, seed: int) -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 7.5,
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "seed": seed,
                "steps": 30,
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"batch_size": 1, "height": 1024, "width": 1024},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["4", 1], "text": prompt},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["4", 1], "text": neg_prompt},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "warnexus_building", "images": ["8", 0]},
        },
    }


def queue_prompt(workflow: dict) -> str:
    payload = json.dumps({"prompt": workflow, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(f"{COMFY_URL}/prompt", data=payload, headers={"Content-Type": "application/json"})
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
            url = f"{COMFY_URL}/view?filename={urllib.parse.quote(img['filename'])}&subfolder={img['subfolder']}&type={img['type']}"
            with urllib.request.urlopen(url) as r:
                return r.read()
    return None


def main():
    print("=== War Nexus Asset Generator ===")
    print(f"Hedef klasör: {OUTPUT_DIR}\n")

    for i, building in enumerate(BUILDINGS, 1):
        print(f"[{i}/{len(BUILDINGS)}] Üretiliyor: {building['id']}...")
        seed = 42 + i * 1000

        workflow = build_workflow(building["prompt"], NEG_PROMPT, seed)

        try:
            prompt_id = queue_prompt(workflow)
            print(f"  → Kuyrukta: {prompt_id[:8]}...")
            wait_for_completion(prompt_id)

            img_data = get_output_image(prompt_id)
            if img_data:
                out_path = os.path.join(OUTPUT_DIR, building["filename"])
                with open(out_path, "wb") as f:
                    f.write(img_data)
                size_kb = len(img_data) // 1024
                print(f"  ✓ Kaydedildi: {building['filename']} ({size_kb} KB)")
            else:
                print(f"  ✗ Görsel alınamadı: {building['id']}")

        except Exception as e:
            print(f"  ✗ Hata: {e}")

        time.sleep(0.5)

    print("\n=== Tamamlandı ===")
    files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith(".png")]
    print(f"Üretilen dosyalar: {len(files)}/{len(BUILDINGS)}")
    for f in sorted(files):
        print(f"  • {f}")


if __name__ == "__main__":
    main()
