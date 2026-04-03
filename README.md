# 🚀 Neon Void Runner

![HTML5](https://img.shields.io/badge/Platform-HTML5-ff00ff?style=flat-square)

A neon sci-fi side-scrolling shooter with weapon evolution, boss fights, and an ambient procedural soundtrack.

## 🎮 How to Play

1. Open `index.html` in any modern browser
2. Choose your ship from 3 unique options
3. Use **WASD** or **Arrow Keys** to move
4. Weapons fire automatically!
5. Pick up weapon drops, shields, and credits from defeated enemies
6. Between levels, choose an upgrade to evolve your weapons
7. Face a boss every 5 levels!
8. Build combos by killing enemies quickly for bonus credits!

## 🚀 Ships

| Ship | Specialty | Speed | Armor | Weapon Slots |
|------|-----------|-------|-------|--------------|
| **PHANTOM** | Speed demon | ⭐⭐⭐⭐⭐ | ⭐⭐ | 2 |
| **TITAN** | Tank | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 2 |
| **HYDRA** | Multi-weapon | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3 |

## 🔫 Weapons & Evolutions

Weapons can be picked up from defeated enemies and evolved between levels:

- **Pulse Laser** → Twin Laser → Quad Laser
- **Spread Shot** → Spread-5 → Nova Burst
- **Micro Missile** → Homing Missile → Swarm Rockets
- **Plasma Bolt** → Plasma Storm → Void Plasma
- **Ion Beam** → Piercing Beam → Death Ray
- **Wave Cannon** → Tsunami Cannon → Gravity Wave
- **Rear Guard** → Rear Blaster → Ambush Cannon
- **Side Cannon** → Dual Sides → Orbital Defense
- **Vertical Beam** → Cross Fire → Star Burst
- **Grenade** → Mega Grenade → Nuclear Blast

**Smart Pickup System:** If your weapon slots are full and you pick up a new weapon, it converts to bonus credits instead of replacing your evolved weapons!

## 👾 Enemy Types

- **Drone** - Flies straight at you
- **Wave Rider** - Sine-wave movement pattern
- **Strafer** - Strafes vertically, fires shots
- **Kamikaze** - Fast, chases your ship
- **Turret** - Slow but shoots rapidly
- **Zig Zagger** - Unpredictable zigzag movement
- **Sniper** - Slow, fires aimed shots
- **Swarmling** - Fast, comes in groups

New enemy types unlock as you progress! Watch for **elite enemies** (mini-bosses) with bonus HP and rewards.

## 🏆 Boss Fights

Every 5 levels you face a boss with:
- Multiple attack patterns (spreads, aimed bursts, rings)
- Phase transitions that increase aggression
- Unique movement patterns
- Drops multiple weapon pickups on defeat
- The ambient soundtrack **escalates** during boss fights with tension drones and faster pulse

## 🔥 Combo System

Kill enemies in quick succession to build combos:
- Every 5 kills in a combo: **+25% credit bonus**
- Combo timer resets with each kill
- Your best combo is tracked and shown on game over

## 🎵 Ambient Soundtrack

A procedurally generated ambient soundtrack that:
- Plays subtle space pads, drones, and crystalline melodies during normal gameplay
- **Escalates dramatically** during boss fights with tension oscillators, alarm drones, and deeper bass
- Features gentle hi-hat patterns that intensify with the action
- Toggleable with **M** key

## 🛡️ Pickups

- **Health** (green) - Restores 1 armor point
- **Shield** (blue) - Temporary invincibility (3 seconds)
- **Credits** (yellow) - Bonus currency
- **Weapons** (colored) - New weapon or credits if slots full

## ✨ Features

- Neon sci-fi aesthetic with glow effects and particle systems
- Parallax scrolling background with nebulae and star fields
- Weapon evolution system with 10 base weapons and 3 evolution tiers
- Progressive difficulty with varied enemy formations
- Combo kill system with credit multiplier
- Smart weapon pickup (credits instead of replacing evolved weapons)
- Danger arrows warning of off-screen enemies
- Mini-boss elite enemies with HP bars
- Screen shake and visual feedback
- High score persistence (localStorage)
- 8 enemy types with distinct behaviors
- Boss every 5 levels with escalating soundtrack
- Procedural ambient music with boss escalation

## 🎮 Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move ship |
| M | Toggle music |
| Enter / Space | Select / Confirm |
| Escape / Q | Skip upgrade screen |

## 🛠️ Tech

Pure HTML5 Canvas + JavaScript + Web Audio API. No dependencies, no build step.

## License

MIT
