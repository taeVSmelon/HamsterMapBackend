class RaidBoss {
  constructor() {
    this.reset();
  }

  activate(bossPrefabName, maxHealth, health, damage, rewardId) {
    this.active = true;
    this.bossPrefabName = bossPrefabName;
    this.maxHealth = maxHealth;
    this.health = health;
    this.damage = damage;
    this.rewardId = rewardId;
    this.updateHealthChange = Math.floor((this.health / this.maxHealth) * 100) /
      100;
    this.playerJoins = new Map();
  }

  takeDamage(ws, username, amount) {
    this.health = Math.max(0, this.health - amount);
    this.playerJoins.set(username, { ws, damage });

    const currentPercent = Math.floor((this.health / this.maxHealth) * 100) /
      100;
    const healthChanged = currentPercent < this.updateHealthChange;

    if (healthChanged) {
      this.updateHealthChange = currentPercent;
    }

    return healthChanged;
  }

  deactivate() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.bossPrefabName = null;
    this.maxHealth = 0;
    this.health = 0;
    this.damage = 0;
    this.rewardId = null;
    this.updateHealthChange = 0;
    this.playerJoins = new Map();
  }
}

module.exports = RaidBoss;
