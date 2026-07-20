import sys

with open("src/components/landing/FeatureShowcase.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Change container max-w
text = text.replace('max-w-[1024px]', 'max-w-[1200px] xl:max-w-[1300px]')

# 2. Extract cards
card1_split = text.split('{/* --- CARD 1: PROCEDURE MANAGEMENT (RED/PINK) --- */}')
pre_card1 = card1_split[0]
rest = card1_split[1]

card2_split = rest.split('{/* --- CARD 2: ACADEMICS (BLUE) --- */}')
card1 = '{/* --- CARD 1: PROCEDURE MANAGEMENT (RED/PINK) --- */}' + card2_split[0]
rest = card2_split[1]

card3_split = rest.split('{/* --- CARD 3: STAFF & ATTENDANCE (GREEN) --- */}')
card2 = '{/* --- CARD 2: ACADEMICS (BLUE) --- */}' + card3_split[0]
rest = card3_split[1]

end_idx = rest.rfind('      </div>\n    </section>')
card3 = '{/* --- CARD 3: STAFF & ATTENDANCE (GREEN) --- */}' + rest[:end_idx]
post_card3 = rest[end_idx:]

# Remove the 'mt-8' from card 3 since it's now in a grid
card3 = card3.replace('shadow-sm mt-8', 'shadow-sm')

# 3. Update scale classes in Card 1 and Card 3
card1 = card1.replace('scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.9] xl:scale-100', 'scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.45] xl:scale-[0.55]')
card3 = card3.replace('scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.9] xl:scale-100', 'scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.45] xl:scale-[0.55]')

# Also update the grid
grid_start = '        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">\n'
grid_end = '        </div>\n'

new_text = pre_card1 + grid_start + card1 + card3 + grid_end + card2 + post_card3

with open("src/components/landing/FeatureShowcase.tsx", "w", encoding="utf-8") as f:
    f.write(new_text)

print("Done")
