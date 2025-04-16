class RaidBoss {
  constructor() {
    this.reset();
  }

  activate(bossPrefabName, maxHealth, damage) {
    this.active = true;
    this.bossPrefabName = bossPrefabName;
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.damage = damage;
    this.updateHealthChange = Math.floor((this.health / this.maxHealth) * 100) /
      100;
    this.playerJoins = new Set();
  }

  takeDamage(playerId, amount) {
    this.health = Math.max(0, this.health - amount);
    this.playerJoins.add(playerId);

    const currentPercent = Math.floor((this.health / this.maxHealth) * 100) /
      100;
    const healthChanged = currentPercent < this.updateHealthChange;

    if (healthChanged) {
      this.updateHealthChange = currentPercent;
    }

    console.log("healthChanged: " + healthChanged);

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
    this.updateHealthChange = 0;
    this.playerJoins = new Set();
  }
}

module.exports = RaidBoss;
