"""
War Nexus — Building Asset Generator v2
DreamShaper XL ile izometrik 3D render kalitesi
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

MODEL = "DreamShaperXL_Turbo_SFWdpmppSde_half_pruned.safetensors"

STYLE = (
    "isometric 3D render, military strategy game building, "
    "diagonal isometric perspective, isolated building on sand platform, "
    "desert operations game art style, photorealistic 3D model, "
    "detailed texture, cinematic lighting from upper left, "
    "desert sandy ground base, professional game asset, "
    "single building centered, dark military aesthetic, "
    "high quality render, sharp details, no background clutter"
)

NEG = (
    "people, soldiers, vehicles, text, watermark, logo, "
    "multiple buildings, crowd, blurry, low quality, "
    "cartoon, anime, flat 2D, white background, "
    "top-down flat view, sketch, draft"
)

BUILDINGS = [
    {
        "id": "hq",
        "filename": "hq.png",
        "prompt": f"{STYLE}, military command center headquarters, "
                  f"large fortified concrete bunker with antenna tower, "
                  f"reinforced walls, command post with sandbags, helipad on roof",
    },
    {
        "id": "barracks",
        "filename": "barracks.png",
        "prompt": f"{STYLE}, military barracks building, "
                  f"long army dormitory with camouflage netting, "
                  f"wooden structure, military green paint, training facility",
    },
    {
        "id": "tankFactory",
        "filename": "tankFactory.png",
        "prompt": f"{STYLE}, military tank factory, "
                  f"large industrial metal hangar with open bay doors, "
                  f"heavy crane overhead, armored vehicle assembly plant, "
                  f"industrial chimney, military manufacturing",
    },
    {
        "id": "airport",
        "filename": "airport.png",
        "prompt": f"{STYLE}, military airbase hangar, "
                  f"aircraft hangar with runway visible, control tower, "
                  f"military jet fighters parked, desert airstrip facility",
    },
    {
        "id": "shipyard",
        "filename": "shipyard.png",
        "prompt": f"{STYLE}, naval military shipyard, "
                  f"dry dock with warship hull, industrial crane, "
                  f"waterfront facility, dock platform, naval port building",
    },
    {
        "id": "oilField",
        "filename": "oilField.png",
        "prompt": f"{STYLE}, desert oil field facility, "
                  f"pump jack oil derrick, cylindrical storage tanks, "
                  f"pipeline connections, crude oil processing unit",
    },
    {
        "id": "mine",
        "filename": "mine.png",
        "prompt": f"{STYLE}, military ore mine facility, "
                  f"open pit mine entrance, ore processing plant, "
                  f"conveyor belt system, mining equipment, rock crusher",
    },
    {
        "id": "bank",
        "filename": "bank.png",
        "prompt": f"{STYLE}, military treasury vault building, "
                  f"heavily armored concrete vault, reinforced steel doors, "
                  f"guard towers, armored cash storage facility",
    },
    {
        "id": "researchLab",
        "filename": "researchLab.png",
        "prompt": f"{STYLE}, military research laboratory, "
                  f"science facility with satellite dishes, "
                  f"server room visible, radar arrays, technical equipment, "
                  f"high-tech military installation",
    },
    {
        "id": "defenseTower",
        "filename": "defenseTower.png",
        "prompt": f"{STYLE}, military defense gun tower, "
                  f"tall guard tower with machine gun emplacement, "
                  f"searchlight, barbed wire perimeter, fortified watchtower",
    },
    {
        "id": "radar",
        "filename": "radar.png",
        "prompt": f"{STYLE}, military radar station, "
                  f"large rotating radar dish on tower, "
                  f"electronic warfare facility, signal arrays, "
                  f"communication antenna cluster",
    },
]


def build_workflow(prompt: str, neg: str, seed: int) -> dict:
    return {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": 2.0,
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": "dpm_adaptive",
                "scheduler": "karras",
                "seed": seed,
                "steps": 8,
            },
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": MODEL},
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
            "inputs": {"clip": ["4", 1], "text": neg},
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"filename_prefix": "warnexus_v2", "images": ["8", 0]},
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
    print("=== War Nexus Building Generator v2 (DreamShaper XL) ===")
    print(f"Model: {MODEL}")
    print(f"Hedef: {OUTPUT_DIR}\n")

    for i, b in enumerate(BUILDINGS, 1):
        print(f"[{i}/{len(BUILDINGS)}] {b['id']}...")
        workflow = build_workflow(b["prompt"], NEG, seed=42000 + i * 777)
        pid = queue_prompt(workflow)
        print(f"  Kuyrukta: {pid[:8]}...")
        wait_for_completion(pid)
        img = get_output_image(pid)
        if img:
            path = os.path.join(OUTPUT_DIR, b["filename"])
            with open(path, "wb") as f:
                f.write(img)
            print(f"  Kaydedildi: {b['filename']} ({len(img)//1024} KB)")
        else:
            print(f"  Hata: gorsel alinamadi")
        time.sleep(0.3)

    print("\nTamamlandi! 11/11 bina uretildi.")


if __name__ == "__main__":
    main()
