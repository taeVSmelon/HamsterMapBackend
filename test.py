import pygame
import heapq
import math

pygame.init()
WIDTH, HEIGHT = 400, 400
TILE_SIZE = 20
ROWS, COLS = HEIGHT // TILE_SIZE, WIDTH // TILE_SIZE
screen = pygame.display.set_mode((WIDTH, HEIGHT))

# Colors
WHITE, BLACK, GREEN, RED, BLUE = (255,255,255), (0,0,0), (0,255,0), (255,0,0), (0,0,255)

# Grid map (0 = walkable, 1 = wall)
grid = [[0 for _ in range(COLS)] for _ in range(ROWS)]

# Sample walls
for i in range(5, 16):
    grid[10][i] = 1

for i in range(0, ROWS):
    grid[i][0] = 1

for i in range(0, ROWS):
    grid[i][COLS-1] = 1
    
for i in range(0, COLS):
    grid[0][i] = 1
    
for i in range(0, COLS):
    grid[ROWS-1][i] = 1

# Start and end points as tuples
start = (2, 2)
end = (15, 10)

ACTOR_WIDTH, ACTOR_HEIGHT = 1, 1

def is_walkable(x, y, width, height):
    for dy in range(height):
        for dx in range(width):
            nx, ny = x + dx, y + dy
            if nx >= COLS or ny >= ROWS or grid[ny][nx] == 1:
                return False
    return True

def heuristic(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

def a_star(start, goal, grid):
    open_set = []
    heapq.heappush(open_set, (0, start))
    came_from = {}
    g_score = {start: 0}
    f_score = {start: heuristic(start, goal)}
    
    while open_set:
        _, current = heapq.heappop(open_set)

        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            return path[::-1]

        # ต้องอยู่ "ใน" while loop
        for dx, dy in [ (0,1), (1,0), (-1,0), (0,-1),
                        (1,1), (-1,1), (-1,-1), (1,-1) ]:
            neighbor = (current[0]+dy, current[1]+dx)
            if 0 <= neighbor[0] < ROWS and 0 <= neighbor[1] < COLS:
                nx, ny = neighbor[1], neighbor[0]
                if not is_walkable(nx, ny, ACTOR_WIDTH, ACTOR_HEIGHT):
                    continue

                # ป้องกัน diagonal เบียดกำแพง
                if dx != 0 and dy != 0:
                    adj1 = (current[1]+dx, current[0])  # แนว x
                    adj2 = (current[1], current[0]+dy)  # แนว y
                    if not is_walkable(*adj1, ACTOR_WIDTH, ACTOR_HEIGHT) or not is_walkable(*adj2, ACTOR_WIDTH, ACTOR_HEIGHT):
                        continue
                    
                tentative_g = g_score[current] + (1.4 if dx != 0 and dy != 0 else 1)
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    f_score[neighbor] = tentative_g + heuristic(neighbor, goal)
                    heapq.heappush(open_set, (f_score[neighbor], neighbor))
    return []

def draw_grid():
    for y in range(ROWS):
        for x in range(COLS):
            rect = pygame.Rect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE)
            if grid[y][x] == 1:
                pygame.draw.rect(screen, BLACK, rect)
            else:
                pygame.draw.rect(screen, WHITE, rect, 1)

def draw_path(path):
    for y, x in path:
        rect = pygame.Rect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE)
        pygame.draw.rect(screen, BLUE, rect)
        
def draw_line_path(path):
    if len(path) < 2:
        return
    points = [(x * TILE_SIZE + TILE_SIZE // 2, y * TILE_SIZE + TILE_SIZE // 2) for y, x in path]
    pygame.draw.lines(screen, (0, 255, 255), False, points, 3)  # Blue line
    
def is_clear_path(start, end, grid):
    # ใช้ Bresenham's Line Algorithm แบบง่าย
    x0, y0 = start[1], start[0]
    x1, y1 = end[1], end[0]

    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    x, y = x0, y0
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    while True:
        if grid[y][x] == 1:
            return False  # เจอกำแพง
        if x == x1 and y == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy
    return True

def draw_diagonal_if_possible(start, end, grid):
    if is_clear_path(start, end, grid):
        p1 = (start[1]*TILE_SIZE + TILE_SIZE//2, start[0]*TILE_SIZE + TILE_SIZE//2)
        p2 = (end[1]*TILE_SIZE + TILE_SIZE//2, end[0]*TILE_SIZE + TILE_SIZE//2)
        pygame.draw.line(screen, (255, 0, 255), p1, p2, 2)  # Magenta เส้นตรง
        
def main():
    global start  # เพิ่ม global เพื่อให้สามารถอัปเดตค่า start ได้
    clock = pygame.time.Clock()
    running = True

    while running:
        clock.tick(20)
        screen.fill(WHITE)

        # คำนวณเส้นทางจาก start ไป goal
        path = a_star(start, end, grid)
        draw_grid()
        draw_path(path)
        draw_diagonal_if_possible(start, end, grid)

        # วาดตัวละครและธง
        pygame.draw.rect(
            screen, GREEN,
            (
                start[1]*TILE_SIZE,
                start[0]*TILE_SIZE,
                TILE_SIZE * ACTOR_WIDTH,
                TILE_SIZE * ACTOR_HEIGHT
            )
        )
        pygame.draw.rect(screen, RED, (end[1]*TILE_SIZE, end[0]*TILE_SIZE, TILE_SIZE, TILE_SIZE))

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # ควบคุมการเคลื่อนที่ของ player
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] and start[1] > 0: start = (start[0], start[1] - 1)
        if keys[pygame.K_RIGHT] and start[1] < COLS - 1: start = (start[0], start[1] + 1)
        if keys[pygame.K_UP] and start[0] > 0: start = (start[0] - 1, start[1])
        if keys[pygame.K_DOWN] and start[0] < ROWS - 1: start = (start[0] + 1, start[1])

        pygame.display.update()

    pygame.quit()

main()
